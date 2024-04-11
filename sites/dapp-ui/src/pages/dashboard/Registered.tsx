import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { assertion } from '@liquid/auth-client/assertion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useCredentialStore } from '../../store';

export function RegisteredCard() {
  const credentials = useCredentialStore((state) => state.addresses);
  const handleTestCredentialClick = () => {
    const credId = window.localStorage.getItem('credId');
    if (!credId) return;
    assertion(credId);
  };
  return (
    <Card>
      <CardMedia
        sx={{
          height: {
            xs: 250,
            sm: 550,
            md: 600,
            lg: 600,
            xl: 600,
          },
        }}
        image="/hero-3.jpg                                                                                                                                                                        "
        title="Step 3: Credential is resgistered"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Registered (3 of 3)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Mobile Device is Connected and Registered
        </Typography>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(credentials).map((address) => (
              <TableRow
                key={address}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {address.slice(0, 5)}...{address.slice(-5)}
                </TableCell>
                <TableCell align="right">
                  <Button>Open</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardActions>
        <Button onClick={handleTestCredentialClick} color="secondary">
          Test Credential
        </Button>
      </CardActions>
    </Card>
  );
}
