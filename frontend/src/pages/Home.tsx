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
  display: boolean;

  constructor (
    data: { [source: string]: Data } = {},
    current_source: string = '',
    nb_step: number = 0,
    display: boolean= false
  ) {

    this.data = data;
    this.current_source = current_source;
    this.nb_step = nb_step;
    this.display = display;
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

  const currentResult = () => {
    if (inProcessResult.image) {
      return (
        <CodeUserValidation
          config={config}
          inProcessResult={inProcessResult}
          setInProcessResult={setInProcessResult}
          setResult={setResult}
        />
      )
    } else if (result.display) {
      return (
        <ResultComponent result={result} setResult={setResult} />
      )
    } else {
      return (
        <div style={{
          width: '80%', height: '80%', display: 'flex',
          justifyContent: 'center', alignItems: 'center',
          border: '1px solid #ddd', borderRadius: 5,
          color: 'rgb(105, 105, 105)'
      }}>
          Result will be displayed here
        </div>
      )
    }
  }

  return (
    <div style={{display: 'block', height: '85vh'}}>
      <Navbar/>
      <div style={{marginTop: '30px', marginLeft: '30px', height: '100%', display: 'flex', justifyContent: 'space-between'}}>
        <div style={{width: '60%'}}>
          <PhoneReferences
            config={config}
            setConfig={setConfig}
            setInProcessResult={setInProcessResult}
            result={result}
            setResult={setResult}
          />
        </div>
        <div
          style={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%'}}
        >
          {currentResult()}
        </div>
      </div>

      <Status />
    </div>
  )
}


export default Home;