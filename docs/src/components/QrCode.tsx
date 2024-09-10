import { SignalClient, toBase64URL } from "@algorandfoundation/liquid-client";
import React, { useEffect, useMemo, useState } from "react";
import { useAccountInfo } from "../hooks/useAccountInfo.ts";
import { useAlgod } from "../hooks/useAlgod.ts";
import {
  type Algodv2,
  encodeUnsignedTransaction,
  makePaymentTxnWithSuggestedParamsFromObject,
  Transaction, waitForConfirmation
} from "algosdk";
import {
  fromBase64Url,
  type ResponseMessage,
  toSignTransactionsParamsRequestMessage
} from "@algorandfoundation/provider";
import { fromResult } from "../hooks/provider.ts";

const url = import.meta.env.PUBLIC_LIQUID_ORIGIN || "liquid-auth.onrender.com";
const INITIAL = "Initializing 🚀";
const PEER_CONNECTED = "Peer connected 🎉";
const SENDING_TRANSACTION = "Requesting Signature 📲";
const RECEIVED_SIGNATURE = "Received Signature 🔏";
const SUBMITTED_TRANSACTION = "Submitted Transaction 🚀";
const TRANSACTION_CONFIRMED = "Transaction Confirmed ✅";
const LINK_REQUEST = "Link Requested 🚚";
const WAITING = "Waiting for Link ⌛";
const LINKED = "Linked 🔗";
const CLOSED = "Closed 🚪";
const ERROR = "Something went wrong 🛑";

type FundAccountProps = {
  address?: string
  onCancel?: React.MouseEventHandler<HTMLButtonElement>
}
function FundAccount({address = "Loading...", onCancel = console.log}){
  return (
    <>
      <h1 className="text-white text-2xl mb-2">Fund Account</h1>
      <p className="text-white">Account is missing funds, you need at least the minimum transaction fee to test</p>
      <input value={address} onChange={()=>{}}/>
      <div className="flex flex-col mt-4 mx-auto gap-2">
        <a role="button" target="_blank" href="https://bank.testnet.algorand.network/" className="px-10 py-2 text-md font-poppins leading-6 border-2 border-liquid-purple text-white">
          Dispenser
        </a>
        <button className="px-10 py-2 text-md font-poppins leading-6 border-2 border-red-600 text-white"
                onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  )
}

type SendTransactionProps = {
  disabled?: boolean,
  onCancel?: React.MouseEventHandler<HTMLButtonElement>,
  onSubmit?: React.MouseEventHandler<HTMLButtonElement>,
}

function SendTransaction({ disabled = false, onCancel = console.log, onSubmit = console.log }: SendTransactionProps) {
  return (
    <>
      <h1 className="text-white text-2xl mb-2">Send Transaction</h1>
      <p className="text-white">Send a simple transaction with 0 Amount</p>
      <div className="flex mt-2 mx-auto gap-2">
        <button disabled={disabled} className="px-10 py-2 text-md font-poppins leading-6 border-2 border-liquid-green text-white"
                onClick={onSubmit}>
          Send
        </button>
        <button className="px-10 py-2 text-md font-poppins leading-6 border-2 border-red-600 text-white"
                onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}

async function makeTransaction(obj: { to: string, from: string, amount: number }, algod: Algodv2) {
  const suggestedParams = await algod.getTransactionParams().do();
  const txn = makePaymentTxnWithSuggestedParamsFromObject({
    ...obj,
    suggestedParams
  });
  return { suggestedParams, txn };
}

let _txn: Transaction | null = null;
let _wallet: string | null = null;
let _auth: string | null = null;

export function QrCode({ label = true }: { label?: boolean }) {
  const [wallet, setWallet] = useState<string | null>(null)
  // Liquid Auth
  const [client] = useState<SignalClient>(() => new SignalClient(url));
  const [dc, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [requestId, setRequestId] = useState<string>(SignalClient.generateRequestId());
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isInFlight, setIsInflight] = useState<boolean>(false);

  // Status String
  const [status, setStatus] = useState<string>(INITIAL);

  // Transaction State
  const [suggestedParams, setSuggestedParams] = useState<any | null>(null);

  // Account
  const accountInfo = useAccountInfo(_wallet, 3000);
  const isFunded = useMemo(() => {
    return suggestedParams && accountInfo.data && accountInfo.data.amount > suggestedParams.minFee;
  }, [accountInfo]);

  function handleError(e: Error){
    setStatus(ERROR)
    setIsInflight(false)
    setIsConnected(false)
  }

  useEffect(() => {
    setIsConnected(false)
    setIsInflight(false)
    setStatus(LINK_REQUEST);

    client.on("link-message", (msg) => {
      setStatus(LINKED);
      _wallet = msg.wallet;
      setWallet(msg.wallet)
    });

    client.peer(requestId, "offer").then((dc) => {
      setDataChannel(dc)
      setIsConnected(true)
      dc.onmessage = (event)=>{
        if(!_txn || !_wallet) return
        try{
          // Try to parse JSON messages, useful for testing
          console.log(JSON.parse(event.data))
        } catch (e){
          let data = fromResult(event.data) as ResponseMessage;
          setStatus(RECEIVED_SIGNATURE)
          const stxns = _txn.attachSignature(_auth ? _auth : _wallet, fromBase64Url(data.result.stxns[0]))
          if(!stxns) {
            setStatus(ERROR);
          } else {
            algod.sendRawTransaction(stxns).do().then(({txId})=>{
              setStatus(SUBMITTED_TRANSACTION)
              waitForConfirmation(algod, txId, 4).then(()=>{
                  setStatus(TRANSACTION_CONFIRMED)
                  setIsInflight(false)
              });
            }).catch(handleError);
          }
        }
      }
      setStatus(PEER_CONNECTED);
    }).catch(handleError);

    client.qrCode().then((url) => {
      setQrCodeUrl(url);
      setStatus(WAITING);
    }).catch(handleError);
    return () => {
      client.close();
      setStatus(CLOSED);
    };
  }, [requestId]);

  const algod = useAlgod();

  // Load Suggested Params
  useEffect(() => {
    algod.getTransactionParams().do().then((params) => {
      setSuggestedParams(params);
    }).catch(handleError);
  }, []);

  useEffect(() => {
    if(accountInfo.data?.['auth-addr']){
      _auth = accountInfo.data['auth-addr']
    }
  }, [accountInfo]);

  function handleSubmit() {
    if (!accountInfo.data || !isFunded || !dc || !_wallet) return;
    setStatus(SENDING_TRANSACTION);
    setIsInflight(true)
    makeTransaction({
      to: _wallet,
      from: _wallet,
      amount: 0
    }, algod)
      .then(({ suggestedParams, txn }) => {
        _txn = txn;
        setSuggestedParams(suggestedParams);
        dc.send(toSignTransactionsParamsRequestMessage(SignalClient.generateRequestId(), "02657eaf-be17-4efc-b0a4-19d654b2448e", [{ txn: toBase64URL(encodeUnsignedTransaction(txn)) }]))
      })
      .catch(handleError);
  }

  function Status() {
    if(status === TRANSACTION_CONFIRMED) return <a role="button" target="_blank" href={`https://testnet.explorer.perawallet.app/tx/${_txn?.txID()}`} className="relative -inset-y-14 text-xl text-liquid-blue mt-2 inline">{status}</a>;
    return <p className="relative -inset-y-14 text-white text-xl mt-2 inline">{status}</p>;
  }

  return <div className="w-80 h-80 flex justify-center">
    {label && <Status />}
    {qrCodeUrl &&
      <a className={"absolute max-w-80"} href={client.deepLink(requestId)}>
        <img className="!mt-0" src={qrCodeUrl} alt="Algorand QRCode" />
      </a>
    }
    {isConnected && <div className="absolute flex flex-col bg-gray-800/[.98] p-6 h-80 justify-center max-w-80">
      {isFunded &&
        <SendTransaction disabled={isInFlight} onSubmit={handleSubmit} onCancel={() => setRequestId(SignalClient.generateRequestId())} />}
      {!isFunded && <FundAccount address={accountInfo.data!!.address} onCancel={() => setRequestId(SignalClient.generateRequestId())} />}
    </div>}
  </div>;
}
