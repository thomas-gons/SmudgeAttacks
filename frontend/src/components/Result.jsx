import {Grid, Paper} from "@mui/material";
import { styled } from '@mui/material/styles';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const Result = ({result, pinCodes}) => {
  const quarter = Math.ceil(pinCodes.length / 4);
  const quarters = [
    pinCodes.slice(0, quarter),
    pinCodes.slice(quarter, quarter*2),
    pinCodes.slice(quarter*2, quarter*3),
    pinCodes.slice(quarter*3)

  ];

  return (
   <div id={"result"}>
      <img src={result} alt="no result" style={{ objectFit: 'fill' }} />
      <Grid container spacing={2} id={"pinCode"}>
        {quarters.map((quarter, qIndex) => (
          <Grid item xs={3} key={qIndex}>
            {quarter.map((pinCode, index) => (
              <Item key={index}>{pinCode}</Item>
            ))}
          </Grid>
        ))}
      </Grid>
    </div>
  );
}


export default Result