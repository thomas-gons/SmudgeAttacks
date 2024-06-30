import {Stage, Layer, Image, Circle, Group, Text} from "react-konva";
import {Config, Data, InProcessResult, Result} from "../pages/Home";
import React from "react";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import api from "../api.js";
import {displayStatus, closeStatus} from "./Status";
import {AxiosError, AxiosResponse} from "axios";
import LightTooltipHelper from "./LightTooltipHelper";
import {BoundingBox} from "./Input/KonvaHelper";


const canvasDim = [450, 450]
const inputWidth = [640, 640];

interface LayoutData {
  label: string;
  help: React.ReactNode;
  selected_color: string;
  unselected_color: string;
  alpha: number;
}


interface CodeUserValidationProps {
  config: Config;
  inProcessResult: InProcessResult;
  setInProcessResult: React.Dispatch<React.SetStateAction<InProcessResult>>;
  setResult: React.Dispatch<React.SetStateAction<Result>>;
}

const CodeUserValidation: React.FC<CodeUserValidationProps> = ({
  config,
  inProcessResult,
  setInProcessResult,
  setResult
}) => {

  if (inProcessResult.image === "") {
    return <div style={{visibility: 'hidden'}}></div>
  }

  const [isSwapped, setIsSwapped] = React.useState<boolean>(false);
  const [unselected_inferred_bboxes, setUnselected_inferred_bboxes] = React.useState<number[]>(
    Array.from({ length: 10 }, (_, index) => (inProcessResult.inferred_ciphers.includes(index) ? 0 : -1))
  );
  const [selected_reference_bboxes, setSelected_reference_bboxes] = React.useState<number[]>(
    inProcessResult.refs_bboxes.map((_, index) => (inProcessResult.inferred_ciphers.includes(index) ? 1 : 0))
  );

  const validation = () => {
    const checkNewCipherCount = selected_reference_bboxes.reduce((acc, item) => acc + item, 0);
    if (checkNewCipherCount > inProcessResult.expected_pin_length) {
      displayStatus('The number of ciphers exceeds the expected pin length', 'warning');
      return;
    } else if (checkNewCipherCount < inProcessResult.expected_pin_length) {
      displayStatus(
        'The number of ciphers is less than the expected pin length',
        'info', automaticMode, {autoHideDuration: null, style: {whiteSpace: 'pre-line'}});
      return;
    }
    handler()
  }

  const handler = () => {

    const new_ciphers = selected_reference_bboxes.flatMap((item: number, index: number) => {
      return Array(item).fill(index);
    });

    const mapping_cipher_bboxes = []

    // loop over the selected_reference_bboxes
    for (const cipher of new_ciphers) {

      if (unselected_inferred_bboxes[cipher] === 0) {
        mapping_cipher_bboxes.push([
          cipher,
          inProcessResult.inferred_bboxes[inProcessResult.inferred_ciphers.indexOf(cipher)]
        ])
        unselected_inferred_bboxes[cipher] = -1
      } else if (selected_reference_bboxes[cipher]) {
        mapping_cipher_bboxes.push([
          cipher,
          inProcessResult.refs_bboxes[cipher]
        ])
      }
    }

    // reconstruct the sequence
    const formData = new FormData();
    formData.append('new_ciphers', JSON.stringify(new_ciphers));
    formData.append('mapping_cipher_bboxes', JSON.stringify(mapping_cipher_bboxes));
    formData.append('reference_bboxes', JSON.stringify(inProcessResult.refs_bboxes));
    formData.append('config', JSON.stringify(config))

    api.post("api/find-pin-code-from-manual", formData)
      .then((response: AxiosResponse) => {
        if (response.status === 200) {

          setInProcessResult(new InProcessResult())

          const data: Data = {
            reference: inProcessResult.reference,
            inferred_bboxes: response.data['bboxes'],
            refs_bboxes: inProcessResult.refs_bboxes,
            image: inProcessResult.image,
            pin_codes: response.data['pin_codes']
          };

          setResult(prevRes => ({
            data: {...prevRes.data, ...{[inProcessResult.filename]: data}},
            current_source: inProcessResult.filename,
            nb_step: prevRes.nb_step + 1
          }));
        }
      })
      .catch((err: AxiosError) => {
        if (err.response != undefined)
          displayStatus(err.response.data, 'error')
      })
  }

  const automaticMode = (
    <Button
      variant={"contained"}
      style={{
        justifyContent: 'space-between',
        backgroundColor: 'transparent', boxShadow: 'none'
      }}
    >
      <Badge
        badgeContent={<CheckIcon/>}
        onClick={() => {
          closeStatus()
          handler()
        }}
      >
      </Badge>
      <Badge
        badgeContent={<CancelIcon/>}
        onClick={() => {
          closeStatus()
        }}
      >
      </Badge>
    </Button>
  )

  const ratio = [canvasDim[0] / inputWidth[0], canvasDim[1] / inputWidth[1]];

  const img: HTMLImageElement = new window.Image();
  img.src = inProcessResult.image;

  const alphaHiddenLike: number = 0.25
  const ref_layout_data: LayoutData = {
    label: 'Reference layout',
    help: (
      <div>
        <p>
          In this setup, users can select ciphers to assist
          the algorithm in more accurately approximating the
          real sequence.<br/><br/>
          Repetitions can be added to a cipher by clicking on it:
        </p>
        <br/>
        <ul>
          <li>Left click to increase the repetition count</li>
          <li>Right click to decrease the repetition count</li>
          <li>Middle click to deselect the cipher</li>
        </ul>
      </div>
    ),
    selected_color: 'rgb(255, 0, 0)',
    unselected_color: 'rgb(0, 255, 0)',
    alpha: (isSwapped ? alphaHiddenLike : 1.0),
  }

  const inferred_layout_data: LayoutData = {
    label: 'Inferred layout',
    help: (
      <div>
        <p>
          In this layout, users can select ciphers to remove ones that are deemed incorrect
          like false positives
        </p>
      </div>
    ),

    selected_color: 'rgb(255, 255, 0)',
    unselected_color: 'rgb(255, 0, 0)',
    alpha: (isSwapped ? 1.0 : alphaHiddenLike),

  }

  const ref_bboxes = () => {
    return (
      inProcessResult.refs_bboxes.map((bbox: number[], index: number) => (
        <BoundingBox
          bbox={bbox}
          key={index}
          ratio={ratio}
          strokeColor={selected_reference_bboxes[index] > 0 ?
            ref_layout_data.selected_color : ref_layout_data.unselected_color
          }
          alpha={ref_layout_data.alpha}
          onClick={(e) => {
            switch (e.evt.button) {
              case 0: // right click => increase count
                setSelected_reference_bboxes(selected_reference_bboxes.map((item: number, i: number) => (
                  (i === index && item < inProcessResult.expected_pin_length) ? item + 1 : item
                ))); break;
              case 1: // middle click => reset count to 0 or 1 if it's an inferred cipher not removed
                setSelected_reference_bboxes(selected_reference_bboxes.map((item: number, i: number) => (
                  (i !== index) ? item:
                    unselected_inferred_bboxes[index] === 0 ? 1 : 0
                ))); break;
              case 2: // left click => decrease count
                setSelected_reference_bboxes(selected_reference_bboxes.map((item: number, i: number) => (
                  i !== index ? item:
                    item > 1 ? item - 1:
                      unselected_inferred_bboxes[index] === 0 ? 1 : 0

                ))); break;
            }
          }}
        />
      ))
    )
  }

  const inferred_bboxes = () => {

    return (
      inProcessResult.inferred_bboxes.map((bbox: number[], index: number) => (
        <BoundingBox
          bbox={bbox}
          key={index}
          ratio={ratio}
          strokeColor={unselected_inferred_bboxes[inProcessResult.inferred_ciphers[index]] == 1 ?
            inferred_layout_data.selected_color: inferred_layout_data.unselected_color
          }
          alpha={inferred_layout_data.alpha}
          onClick={() => {
            if (!isSwapped) return;

            setSelected_reference_bboxes(
              selected_reference_bboxes.map((item: number, i: number) => (
                i !== inProcessResult.inferred_ciphers[index] ? item:
                  unselected_inferred_bboxes[inProcessResult.inferred_ciphers[index]] === 0 ? item - 1:
                    item < 6 ? item + 1: item
              ))
            );

            setUnselected_inferred_bboxes(
              unselected_inferred_bboxes.map((item: number, i: number) => (
                i === inProcessResult.inferred_ciphers[index] ? (item === 0 ? 1 : 0) : item
              ))
            );
          }}
        />
      ))
    );
  }

  const repetition = () => {
    return (
      inProcessResult.refs_bboxes.map((bbox: number[], index: number) => {
          if (selected_reference_bboxes[index] === 0) return (<></>);

          const x = (bbox[0] + bbox[2]) * ratio[0];
          const y = (bbox[1] + 0.5 * bbox[3]) * ratio[1];
          return (
            <Group key={index}>
              <Circle
                x={x}
                y={y}
                radius={10}
                fill={'red'}
              />
              <Text
                x={x}
                y={y}
                text={String(selected_reference_bboxes[index])} // or any text you want
                fontFamily={'Arial, sans-serif'}
                fontSize={13}
                fontStyle={'bold'}
                fill={'white'}
                align="center"
                verticalAlign="middle"
                offsetX={4} // Adjust this based on the text width
                offsetY={5.5} // Adjust this based on the text height
              />
            </Group>
          )
        }
      ))
  }

  const       bboxes: React.JSX.Element[][] = isSwapped ? [ref_bboxes(), inferred_bboxes()] : [inferred_bboxes(), ref_bboxes(), repetition()];

  const helper = () => {
    const layout_data: LayoutData = isSwapped ? inferred_layout_data : ref_layout_data;

    return (
      <div
        style={{
          border: 'solid 1pt rgb(221, 221, 221)',
          borderRadius: '10px',
          padding: '15px',
          marginLeft: '20px',
          width: '350px',
          height: 'fit-content',
          color: 'rgb(95, 95, 95)'
        }}
      >
        <div style={{display: 'flex'}}>
          {layout_data.label}
          <div style={{marginTop: '-10px', marginLeft: '-2px'}}>
            <LightTooltipHelper
              title={"Changes applied to this layout won't affect the other one but both" +
                     " will be used to find the PIN code"}
              placement={"right-end"}
            />
          </div>
        </div>
        {layout_data.help}
        <div style={{display: 'flex', marginTop: '20px', color: 'black'}}>
          <div style={{
            border: 'solid 2pt ' + layout_data.selected_color,
            width: '30px', height: '20px',
            marginRight: '10px'
          }}></div>
          selected color
        </div>
        <div style={{display: 'flex', marginTop: '20px', color: 'black'}}>
          <div style={{
            border: 'solid 2pt ' + layout_data.unselected_color,
            width: '30px', height: '20px',
            marginRight: '10px'

          }}></div>
          unselected color
        </div>
        <Button
          sx={{marginTop: '20px', marginLeft: '220px'}}
          onClick={() => setIsSwapped(!isSwapped)}
        >
          Swap layouts
        </Button>
      </div>
    )
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div
        style={{display: 'flex', flexDirection: 'row'}}
        onContextMenu={(e) => e.preventDefault()}>
        <Stage
          width={canvasDim[0]}
          height={canvasDim[1]}
        >
          <Layer>
            <Image
              image={img}
              width={canvasDim[0]}
              height={canvasDim[1]}
            />
            {bboxes}
          </Layer>
        </Stage>
        {helper()}
      </div>
      <Button
        onClick={validation}
      >
        Correct
      </Button>
    </div>
  );
};

export default CodeUserValidation;
