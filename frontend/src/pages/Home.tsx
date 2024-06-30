import React from "react";

import PhoneReferences from "../components/Input/PhoneReferences";
import ResultComponent from "../components/Result"
import Navbar from "../components/Navbar"
import CodeUserValidation from "../components/CodeUserValidation";
import Status from "../components/Status";

import "../styles/Home.css"

type InferenceCorrection = 'manual' | 'auto'

export class Config {
  pin_length: number = 6;
  order_guessing_algorithms: { [algorithm: string]: boolean } = {};
  order_cipher_guesses: string[] = Array.from({length: 6}, () => '');
  inference_correction: InferenceCorrection = 'manual';

  getSelectedOrderGuessingAlgorithms = () => {
    return Object.keys(this.order_guessing_algorithms).filter(algo => this.order_guessing_algorithms[algo])
  }

  resetOrderGuessingAlgorithms = () => {
    for (const algo in this.order_guessing_algorithms) {
      this.order_guessing_algorithms[algo] = true
    }
  }

  resetCipherGuess = () => {
    this.order_cipher_guesses = Array.from({length: this.pin_length}, () => '')
  }
}

export class InProcessResult {
  reference: string;
  filename: string;
  image: string;
  refs_bboxes: number[][];
  inferred_bboxes: number[][];
  inferred_ciphers: number[];
  expected_pin_length: number;

  constructor (
    reference: string = "",
    filename: string = "",
    image: string = "",
    refs_bboxes: number[][] = [],
    inferred_bboxes: number[][] = [],
    inferred_ciphers: number[] = [],
    expected_pin_length: number = 6
  ) {

    this.reference = reference;
    this.filename = filename;
    this.image = image;
    this.refs_bboxes = refs_bboxes;
    this.inferred_bboxes = inferred_bboxes;
    this.inferred_ciphers = inferred_ciphers;
    this.expected_pin_length = expected_pin_length;
  }
}

export interface Data {
  reference: string
  image: string,
  refs_bboxes: number[][];
  inferred_bboxes: number[][];
  pin_codes: string[]
}

export class Result {
  data: { [source: string]: Data };
  current_source: string;
  nb_step: number;

  constructor (
    data: { [source: string]: Data } = {},
    current_source: string = '',
    nb_step: number = 0
  ) {

    this.data = data;
    this.current_source = current_source;
    this.nb_step = nb_step;
  }
}


function Home() {

  const [
    config,
    setConfig
  ] = React.useState<Config>(new Config)

  const [
    inProcessResult,
    setInProcessResult] = React.useState<InProcessResult>(new InProcessResult())

  const [
    result,
    setResult] = React.useState<Result>(new Result())


  return (
    <div>
      <Navbar/>
      <div style={{marginTop: '30px', marginLeft: '30px', display: 'flex', justifyContent: 'space-between'}}>
        <div style={{width: '60%'}}>
          <PhoneReferences
            config={config}
            setConfig={setConfig}
            setInProcessResult={setInProcessResult}
            result={result}
            setResult={setResult} />
        </div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%'}}>
          <CodeUserValidation
            config={config}
            inProcessResult={inProcessResult}
            setInProcessResult={setInProcessResult}
            setResult={setResult}
          />
          <ResultComponent result={result} setResult={setResult} />
        </div>
      </div>

      <Status />
    </div>
  )
}


export default Home;