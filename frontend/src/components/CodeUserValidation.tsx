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

interface InferredValidation {
  unselected: number[];
  selected: number[];
}

type InferredValidationDict = { [cipher: number]: InferredValidation };

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
  setResult,
}) => {

  const [isSwapped, setIsSwapped] = React.useState<boolean>(false);
  const [inferred_validation_dict, setInferredValidationDict] = React.useState<InferredValidationDict>(
    inProcessResult.inferred_ciphers.reduce((acc: InferredValidationDict, item: number) => {
      acc[item] = {
        unselected: [],
        selected: inProcessResult.inferred_bboxes.reduce((selectedIndices: number[], bbox, i) => {
          if (inProcessResult.inferred_ciphers[i] === item) {
            selectedIndices.push(i);
          }
          return selectedIndices;
        }, [])
      };
      return acc;
    }, {})
  );

  const [selected_reference_bboxes, setSelectedReferenceBboxes] = React.useState<number[]>(
    Array.from({length: 10}, (_, index) => (
      inProcessResult.refs_bboxes.filter((_, i) =>
        inProcessResult.inferred_ciphers[i] === index).length
      )
    )
  );

  const validation = () => {
    const checkNewCipherCount = Object.values(selected_reference_bboxes).reduce((acc, item) => acc + item, 0);
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

    const new_ciphers = Object.entries(selected_reference_bboxes)
      .flatMap(([index, repCount]) => Array(repCount).fill(Number(index)));

    const mapping_cipher_bboxes = []

    // loop over the selected_reference_bboxes
    for (const cipher of new_ciphers) {
      if (inferred_validation_dict[cipher] !== undefined && inferred_validation_dict[cipher].selected.length > 0) {
        const bbox_index = inferred_validation_dict[cipher].selected.pop()
        if (bbox_index === undefined) return;
        mapping_cipher_bboxes.push([
          cipher,
          inProcessResult.inferred_bboxes[bbox_index]
        ])
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
            nb_step: prevRes.nb_step + 1,
            display: true
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

    selected_color: 'rgb(255, 0, 0)',
    unselected_color: 'rgb(255, 255, 0)',
    alpha: (isSwapped ? 1.0 : alphaHiddenLike),

  }

  const ref_bboxes = () => {
    const bboxes = []
    for (const [index, bbox] of inProcessResult.refs_bboxes.entries()) {
        let current_rep_count = selected_reference_bboxes[index];
        const min_rep_count = inferred_validation_dict[index] ? inferred_validation_dict[index].selected.length : 0;
        bboxes.push(
          <BoundingBox
          bbox={bbox}
          key={index}
          ratio={ratio}
          strokeColor={selected_reference_bboxes[index] > 0 ?
            ref_layout_data.selected_color : ref_layout_data.unselected_color
          }
          alpha={ref_layout_data.alpha}
          onClick={(e) => {
            if (isSwapped) return

            switch (e.evt.button) {
              case 0: // right click => increase count
                if (current_rep_count < inProcessResult.expected_pin_length) {
                  current_rep_count += 1
                }
                break;
              case 1: // middle click => reset count to 0 or 1 if it's an inferred cipher not removed
                  current_rep_count = min_rep_count
                break;
              case 2: // left click => decrease count
                if (current_rep_count > min_rep_count)
                  current_rep_count -= 1
                break;
              }
            setSelectedReferenceBboxes({
              ...selected_reference_bboxes,
              [index]: current_rep_count
            })
          }}
        />
      )
    }
    return bboxes;
  }

  const inferred_bboxes = () => {
    const bboxes = []
    for (const [index, cipher] of inProcessResult.inferred_ciphers.entries()) {
      const bbox = inProcessResult.inferred_bboxes[index]
      const selected = inferred_validation_dict[cipher].selected.includes(index)
      const inferred_validation = inferred_validation_dict[cipher]
      bboxes.push(
        <BoundingBox
          bbox={bbox}
          key={index}
          ratio={ratio}
          strokeColor={selected ?
            inferred_layout_data.selected_color : inferred_layout_data.unselected_color
          }
          alpha={inferred_layout_data.alpha}
          onClick={() => {
            if (!isSwapped) return;

            let reference_rep_count = selected_reference_bboxes[cipher];
            if (!selected) {
              reference_rep_count = Math.min(reference_rep_count + 1, inProcessResult.expected_pin_length);
            } else {
              reference_rep_count -= 1;
            }
            setSelectedReferenceBboxes({
              ...selected_reference_bboxes,
              [cipher]: reference_rep_count
            });

            if (selected) {
              inferred_validation.unselected.push(index);
              inferred_validation.selected = inferred_validation.selected.filter((item) => item !== index);
            } else {
              inferred_validation.unselected = inferred_validation.unselected.filter((item) => item !== index);
              inferred_validation.selected.push(index);
            }

            setInferredValidationDict({
              ...inferred_validation_dict,
              [cipher]: inferred_validation
            });
          }}
        />
      )
    }
    return bboxes;
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

  const bboxes: React.JSX.Element[][] = isSwapped ? [ref_bboxes(), inferred_bboxes()] : [inferred_bboxes(), ref_bboxes(), repetition()];

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
