import os

import numpy as np
from typing import *
from tqdm import tqdm
import inflect

p = inflect.engine()


class StatsBuilder:
    def __init__(self, filename):
        self.filename: LiteralString = filename

        with open(filename, 'r') as f:
            # do not count '\n'
            self.pin_len = len(f.readline()) - 1
            f.seek(0)

            self.all_pins_dict = {}
            self.all_pins = np.zeros((10 ** self.pin_len))
            for line in tqdm(f.readlines(), desc="File reading: "):
                pin = line.strip()
                self.all_pins_dict[pin] = 1 if self.all_pins_dict.get(pin) is None else self.all_pins_dict[pin] + 1
                self.all_pins[int(pin)] += 1

            self.sample_size = int(self.all_pins.sum())
            self.unique_pins = self.all_pins[np.where(self.all_pins > 0)]

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
        markov_chaine_transition = np.zeros((10, 10))
        for pin, occ in tqdm(self.all_pins_dict.items(), desc="Markov chain transition computation: "):
            for i in range(self.pin_len - 1):
                markov_chaine_transition[int(pin[i]), int(pin[i + 1])] += occ

        markov_chaine_transition /= self.sample_size
        return markov_chaine_transition

    def save_stats(self):
        path = f'../assets/stats/{p.number_to_words(self.pin_len)}_symbols/'
        os.makedirs(path, exist_ok=True)
        self.__compute_frequencies().dump(path + "frequenciesDump")
        self.__compute_prob_by_index().dump(path + "probByIndexDump")
        self.__compute_markov_chain_transitions().dump(path + "markovChainTransitionMatDump")


sb = StatsBuilder('/path/to/pincode/database')
sb.save_stats()
