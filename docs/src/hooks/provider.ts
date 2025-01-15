import {decode} from 'cbor-x'
import { decodeUnsignedTransaction } from "algosdk";
import { type IARC0001Transaction, ResponseMessage, type Results, fromBase64Url } from "@algorandfoundation/provider";

export function attachEncodedSignature(address: string, txn: string, signature: string){
  return decodeUnsignedTransaction(fromBase64Url(txn))
    .attachSignature(address, fromBase64Url(signature));
}

export function attachSignedTransactionsFromResult(address: string, result: Results, txns: IARC0001Transaction[]){
  let stxns = [];
  for(let i = 0; i < txns.length; i++){
    stxns.push(attachEncodedSignature(address, txns[i].txn, result.stxns[i]!!))
  }
  return stxns
}

export function fromResult(result: string): ResponseMessage {
  return decode(fromBase64Url(result)) as ResponseMessage
}

