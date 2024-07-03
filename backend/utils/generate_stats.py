import os
from tqdm import tqdm
from typing import *

import random
import numpy as np

from utils.cipher_to_literal import ciphers_to_literal


class StatsBuilder:
    symbols = '0123456789'
    all_pins_dict = {}

    def __init__(
            self,
            filename: Optional[str] = None,
            file_buffer: Optional[BinaryIO] = None,
            expected_pin_len: int = 6
    ):

        if filename is None and file_buffer is None:
            raise ValueError("Either filename or file_buffer must be provided")

        content = (open(filename, 'r').read() if filename is not None else
                   file_buffer.read().decode('utf-8'))

        content = content.split('\n')
        content = content[:-1] if content[-1] == '' else content
        self.pin_len = len(content[0])
        if self.pin_len != expected_pin_len:
            raise ValueError("The PIN length is not the one expected")

        symbols_product_space = len(self.symbols) ** self.pin_len
        self.all_pins = np.zeros(symbols_product_space)
        for line in tqdm(content, desc="File reading: "):
            pin = line.strip()
            if (len(pin) != self.pin_len) or (not pin.isdigit()):
                print(f"Invalid PIN: {pin}")
            self.all_pins_dict[pin] = 1 if self.all_pins_dict.get(pin) is None else self.all_pins_dict[pin] + 1
            self.all_pins[int(pin)] += 1

        for i in range(symbols_product_space):
            pin_code = str(i).zfill(self.pin_len)
            if self.all_pins_dict.get(pin_code) is None:
                self.all_pins[i] = 1
                self.all_pins_dict[pin_code] = 1

        self.sample_size = int(self.all_pins.sum())

    def __compute_frequencies(self) -> np.ndarray:
        return self.all_pins / self.sample_size

    def __compute_prob_by_index(self) -> np.ndarray:
        prob_by_index = np.zeros((10, self.pin_len))
        for pin, occ in tqdm(self.all_pins_dict.items(), desc="Probabilities by index computation: "):
            for index, symbol in enumerate(pin):
                prob_by_index[int(symbol), index] += occ

        prob_by_index /= self.sample_size
        return prob_by_index

    def __compute_markov_chain_transitions(self) -> np.ndarray:
        markov_chain_transition = np.zeros((10, 10))
        for pin, occ in tqdm(self.all_pins_dict.items(), desc="Markov chain transition computation: "):
            for i in range(self.pin_len - 1):
                markov_chain_transition[int(pin[i]), int(pin[i + 1])] += occ

        row_sums = markov_chain_transition.sum(axis=1, keepdims=True)
        np.divide(markov_chain_transition, row_sums, out=markov_chain_transition, where=row_sums != 0)
        return markov_chain_transition

    def save_stats(self):
        path = f'assets/stats/{ciphers_to_literal[self.pin_len]}_symbols/'
        os.makedirs(path, exist_ok=True)
        self.__compute_frequencies().dump(path + "frequenciesDump")
        self.__compute_prob_by_index().dump(path + "probByIndexDump")
        self.__compute_markov_chain_transitions().dump(path + "markovChainTransitionMatDump")

    @staticmethod
    def get_pin_codes_acc_freq(n: int, pin_length: int = 6) -> List[str]:
        f = np.load(f"../assets/stats/{ciphers_to_literal[pin_length]}_symbols/frequenciesDump", allow_pickle=True)

        intervals = np.cumsum(f)

        pin_codes = []
        for i in range(n):
            t = random.random()
            pos = np.searchsorted(intervals, t, side='right')
            pin_codes.append(str(pos).zfill(pin_length))

        return pin_codes


if __name__ == '__main__':
    for pin_code in StatsBuilder.get_pin_codes_acc_freq(40):
        print(pin_code)
