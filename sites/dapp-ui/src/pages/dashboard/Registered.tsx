import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import { fromBase64Url, toBase64URL } from '@liquid/auth-client';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useCredentialStore } from '../../store';

const DEFAULTS = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

type SerializedAuthenticatorAssertionResponse = {
  [k: string]: string
  clientDataJSON: string,
  authenticatorData: string,
  signature: string,
  userHandle: string,
}
type SerializedCredential = {
  [k: string]: string | SerializedAuthenticatorAssertionResponse
  id: string
  type: string
  response: SerializedAuthenticatorAssertionResponse
  rawId: string
}

export async function assertion(credId: string) {
  console.log(
    `%cFETCHING: %c/assertion/request/${credId}`,
    'color: yellow',
    'color: cyan',
  );
  const options = await fetch(`/assertion/request/${credId}`, {
    ...DEFAULTS,
  }).then((r) => r.json());

  if (options.allowCredentials.length === 0) {
    console.info('No registered credentials found.');
    return Promise.resolve(null);
  }

  options.challenge = fromBase64Url(options.challenge);

  for (const cred of options.allowCredentials) {
    cred.id = fromBase64Url(cred.id);
  }

  console.log(
    '%cGET_CREDENTIAL:%c navigator.credentials.get',
    'color: yellow',
    'color: cyan',
    options,
  );
  const cred = (await navigator.credentials.get({
    publicKey: options,
  })) as PublicKeyCredential;

  if(!cred) throw new Error('Could not get credential')
  const response = cred.response as AuthenticatorAssertionResponse & {[k: string]: ArrayBuffer}
  const credential: SerializedCredential = {
    id: cred.id,
    type: cred.type,
    rawId: toBase64URL(cred.rawId),
    response: Object.keys(response).reduce((prev, curr)=>{
      prev[curr] = toBase64URL(response[curr])
      return prev
    }, {} as SerializedAuthenticatorAssertionResponse)
  };
  credential.id = cred.id;
  credential.type = cred.type;
  credential.rawId = toBase64URL(cred.rawId);

  if (cred.response) {

    const clientDataJSON = toBase64URL(response.clientDataJSON);
    const authenticatorData = toBase64URL(response.authenticatorData);
    const signature = toBase64URL(response.signature);
    const userHandle = toBase64URL(response.userHandle || new Uint8Array());
    credential.response = {
      clientDataJSON,
      authenticatorData,
      signature,
      userHandle,
    };
  }
  console.log(
    '%cPOSTING: %c/assertion/response',
    'color: yellow',
    'color: cyan',
    credential,
  );
  return await fetch(`/assertion/response`, {
    ...DEFAULTS,
    body: JSON.stringify(credential),
  });
}
export function RegisteredCard(){
  const credentials = useCredentialStore((state)=> state.addresses);
  const handleTestCredentialClick = () => {
    console.log('Test Credential')
    const credId = window.localStorage.getItem('credId');
    if(!credId) return
    assertion(credId);
      // window.location.reload();
  }
    return (
        <Card >
            <CardMedia
              sx={{ height: {
                  xs: 250,
                  sm: 550,
                  md: 600,
                  lg: 600,
                  xl: 600,
                }
              }}
                image="/hero-3.jpg                                                                                                                                                                        "
                title="Step 1: Connect Wallet"
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
                    {/*<TableCell align="right">Credentials</TableCell>*/}
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
                      {/*<TableCell align="right">{credentials[address].credentials.length}</TableCell>*/}
                      <TableCell align="right"><Button>Open</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardActions>
              <Button onClick={handleTestCredentialClick} color="secondary">Test Credential</Button>
              {/*<Button>Sign Out</Button>*/}
            </CardActions>
        </Card>
    )
}
