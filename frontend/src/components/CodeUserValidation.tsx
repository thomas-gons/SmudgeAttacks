import {Stage, Layer, Image, Rect, Circle, Group, Text} from "react-konva";
import {InProcessResult, DisplayState, Result} from "../pages/Home";
import React from "react";
import Button from "@mui/material/Button";
import {closeSnackbar, enqueueSnackbar} from "notistack";
import {Grow, Tooltip, tooltipClasses, TooltipProps} from "@mui/material";
import Badge from "@mui/material/Badge";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import api from "../api";
import {styled} from "@mui/material/styles";
import InfoIcon from "@mui/icons-material/Info";


const canvasDim = [450, 450]
const inputWidth = [640, 640];

interface LayoutData {
  label: string;
  help: HTMLDivElement;
  selected_color: string;
  unselected_color: string;
  alpha: number;
}


interface CodeUserValidationProps {
  inProcessResult: InProcessResult;
  setInProcessResult: React.Dispatch<React.SetStateAction<InProcessResult>>;
  setResult: React.Dispatch<React.SetStateAction<Result>>;
}

export const displayStatus = (message: string, severity: string, action = null, options = {}) => {
  enqueueSnackbar({message, variant: severity, TransitionComponent: Grow, action, ...options})
}

const LightTooltip = styled(({className, ...props}: TooltipProps) => (
  <Tooltip {...props} classes={{popper: className}}/>
))(({theme}) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.white,
    color: 'rgba(0, 0, 0, 0.6)',
    boxShadow: theme.shadows[1],
    fontSize: 14,
    maxWidth: '200px',
  },
}));

const CodeUserValidation: React.FC<CodeUserValidationProps> = ({
 inProcessResult,
 setInProcessResult,
 setResult
}) => {

  if (inProcessResult.image === "") {
    return <div style={{visibility: 'hidden'}}></div>
  }

  const [isSwapped, setIsSwapped] = React.useState<boolean>(false);
  const [rmBboxes, setRmBboxes] = React.useState<boolean[]>([]);
  const [addedBboxes, setAddedBboxes] = React.useState<number[]>(
    inProcessResult.refs_bboxes.map((_, index) => (inProcessResult.inferred_ciphers.includes(index) ? 1 : 0))
  );

  const validation = () => {
    const checkNewCipherCount = addedBboxes.reduce((acc, item) => acc + item, 0);
    if (checkNewCipherCount > inProcessResult.expected_pin_length) {
      displayStatus('The number of ciphers exceeds the expected pin length', 'warning');
      return;
    } else if (checkNewCipherCount < inProcessResult.expected_pin_length) {
      displayStatus(
        'The number of ciphers is less than the expected pin length',
        'info', () => (automaticMode), {autoHideDuration: null, style: {whiteSpace: 'pre-line'}});
      return;
    }
    handler()
  }

  const handler = () => {
    // reconstruct the sequence
    const new_ciphers = addedBboxes.flatMap((item, index) => {
      return Array(item).fill(index); // Utilise index + 1 pour correspondre à l'exemple donné
    });

    const formData = new FormData();
    formData.append('new_ciphers', JSON.stringify(new_ciphers));
    console.log(new_ciphers)

    api.post("/api/find-pin-code-from-manual", formData)
      .then((response) => {
        if (response.status === 200) {
          console.log(response.data)
        }
      })
      .catch((err) => {
        // displayStatus(err.response.data, 'error')
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
          closeSnackbar()
          handler()
        }}
      >
      </Badge>
      <Badge
        badgeContent={<CancelIcon/>}
        onClick={() => {
          closeSnackbar()
        }}
      >
      </Badge>
    </Button>
  )

  const ratio = [canvasDim[0] / inputWidth[0], canvasDim[1] / inputWidth[1]];

  const img: HTMLImageElement = new window.Image();
  img.src = inProcessResult.image;

  const rgbToRgba = (rgb: string, alpha: number) => `rgba(${rgb.slice(4, -1)}, ${alpha})`;


  const draw_bboxes = (
    bboxes: number[][],
    selected_bbox: boolean[] | number[],
    setSelected_bbox: React.Dispatch<React.SetStateAction<boolean[] | number[]>>,
    layout_data: LayoutData
  ) => {

    const rgbToRgba = (rgb: string, alpha: number) => `rgba(${rgb.slice(4, -1)}, ${alpha})`;

    const selected_color = rgbToRgba(layout_data.selected_color, layout_data.alpha);
    const unselected_color = rgbToRgba(layout_data.unselected_color, layout_data.alpha);

    return (
      bboxes.map((bbox, index) => (
        <Rect
          key={index} // Ensure each Rect has a unique key
          x={bbox[0] * ratio[0]}
          y={bbox[1] * ratio[1]}
          width={bbox[2] * ratio[0]}
          height={bbox[3] * ratio[1]}
          stroke={selected_bbox.includes(index) ? selected_color : unselected_color}
          strokeWidth={2}
          onClick={() => {
            if (!isSwapped) return;

            if (selected_bbox.includes(index)) {
              setSelected_bbox(selected_bbox.filter((item) => item !== index));
            } else {
              setSelected_bbox([...selected_bbox, index]);
            }
          }}
        />
      ))
    )
  }

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
        <p>
          <ul>
            <li>Left click to increase the repetition count</li>
            <li>Right click to decrease the repetition count</li>
            <li>Middle click to deselect the cipher</li>
          </ul>
        </p>
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

    const selected_color = rgbToRgba(ref_layout_data.selected_color, ref_layout_data.alpha);
    const unselected_color = rgbToRgba(ref_layout_data.unselected_color, ref_layout_data.alpha);

    return (
      inProcessResult.refs_bboxes.map((bbox, index) => (
        <Rect
          key={index} // Ensure each Rect has a unique key
          x={bbox[0] * ratio[0]}
          y={bbox[1] * ratio[1]}
          width={bbox[2] * ratio[0]}
          height={bbox[3] * ratio[1]}
          stroke={addedBboxes[index] > 0 ? selected_color : unselected_color}
          strokeWidth={2}
          onClick={(e) => {
            switch (e.evt.button) {
              case 0:
                setAddedBboxes(addedBboxes.map((item, i) => (i === index && item < 6 ? item + 1 : item)));
                break;
              case 1:
                setAddedBboxes(addedBboxes.map((item, i) => (i === index ? 0 : item)));
                break;
              case 2:
                setAddedBboxes(addedBboxes.map((item, i) => (i === index && item > 0 ? item - 1 : item)));
                break;
              default:
                break;
            }
          }}
        />
      ))
    )
  }

  const inferred_bboxes = draw_bboxes(
    inProcessResult.inferred_bboxes,
    rmBboxes, setRmBboxes,
    inferred_layout_data
  )


  const repetition = () => {
    return (
      inProcessResult.refs_bboxes.map((bbox, index) => {
          if (addedBboxes[index] === 0) return null;

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
                text={String(addedBboxes[index])} // or any text you want
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

  const bboxes = isSwapped ? [ref_bboxes(), inferred_bboxes] : [inferred_bboxes, ref_bboxes(), repetition()];

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
          <div style={{marginTop: '-17px', marginLeft: '-6px'}}>
          <LightTooltip
            title={"Changes applied to this layout won't affect the other one but both will be used to find the PIN code"}
            placement={"right-end"}
          >
            <InfoIcon sx={{
              width: '20px',
              color: 'rgb(21, 101, 192)',
              m: 1
            }}/>
          </LightTooltip>
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