import {styled} from "@mui/material/styles";
import {Tooltip, tooltipClasses, TooltipProps} from "@mui/material";
import * as React from "react";
import InfoIcon from "@mui/icons-material/Info";


const LightTooltip = styled(({className, ...props}: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))(({theme}) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: theme.palette.common.white,
        color: 'rgba(0, 0, 0, 0.6)',
        boxShadow: theme.shadows[1],
        fontSize: 14,
        maxWidth: '200px',
    },
}));

type Placement = 'bottom-end'
    | 'bottom-start'
    | 'bottom'
    | 'left-end'
    | 'left-start'
    | 'left'
    | 'right-end'
    | 'right-start'
    | 'right'
    | 'top-end'
    | 'top-start'
    | 'top';

interface LightTooltipHelperProps {
    title: string | Element,
    placement?: Placement

}

const LightTooltipHelper: React.FC<LightTooltipHelperProps> = ({
     title,
     placement = "right-start"
 }) => {

    return (
        <LightTooltip
            title={title}
            placement={placement}
        >
            <InfoIcon sx={{
                marginLeft: '3px',
                marginBottom: '-1px',
                width: '20px',
                color: 'rgb(21, 101, 192)'
            }}/>
        </LightTooltip>
    )
}


export default LightTooltipHelper;