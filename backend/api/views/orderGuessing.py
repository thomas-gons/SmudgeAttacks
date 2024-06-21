from itertools import permutations
from functools import reduce
from typing import *
from collections import defaultdict
import os

import numpy as np

from api.config import config
from utils.cipher_to_literal import ciphers_to_literal
from utils.generate_stats import StatsBuilder


class OrderGuessing:

    __instance = None

    @staticmethod
    def get_order_guessing_instance(pin_length=6, should_update=False) -> str:
        if OrderGuessing.__instance is None:
            OrderGuessing.__instance = OrderGuessing()

        if should_update and OrderGuessing.__instance.pin_length != pin_length:
            OrderGuessing.__instance.update_stats(pin_length)
            OrderGuessing.__instance.pin_length = pin_length

        return OrderGuessing.__instance

    def __init__(self):
        self.pin_length = config["pin_length"]
        pin_length_lit = ciphers_to_literal[self.pin_length]
        for k, v in config["OrderGuessing"].items():
            config["OrderGuessing"][k] = v.replace("###", pin_length_lit)

        self.transition_mat = np.load(config["OrderGuessing"]["transition_matrix"], allow_pickle=True)
        self.prob_by_index = np.load(config["OrderGuessing"]["prob_by_index"], allow_pickle=True)
        self.freq = np.load(config["OrderGuessing"]["frequencies"], allow_pickle=True)

    @staticmethod
    def check_new_pin_length(pin_length: int) -> bool:
        prev_pin_length = OrderGuessing.get_order_guessing_instance().pin_length
        if pin_length == prev_pin_length:
            return True

        prev_pin_length = ciphers_to_literal[prev_pin_length]
        pin_length_lit = ciphers_to_literal[pin_length]
        # check if the directory exists
        for k, v in config["OrderGuessing"].items():
            config["OrderGuessing"][k] = v.replace(prev_pin_length, pin_length_lit)
            if not os.path.exists(config["OrderGuessing"][k]):
                return False

        return True

    @staticmethod
    def generate_stats(_pin_length: int, _filename: str) -> None:
        sb = StatsBuilder(_filename, _pin_length)
        sb.save_stats()

    def update_stats(self, _pin_length: int) -> None:
        pin_length_lit = ciphers_to_literal[_pin_length]
        for k, v in config["OrderGuessing"].items():
            config["OrderGuessing"][k] = v.replace("###", pin_length_lit)

        try:
            self.transition_mat = np.load(config["OrderGuessing"]["transition_matrix"], allow_pickle=True)
            self.prob_by_index = np.load(config["OrderGuessing"]["prob_by_index"], allow_pickle=True)
            self.freq = np.load(config["OrderGuessing"]["frequencies"], allow_pickle=True)
        except FileNotFoundError:
            raise FileNotFoundError("The stats file does not exist. Please generate it first.")

    @staticmethod
    def reduce_permutations_by_guess(ciphers, cipher_guess: List[str]) -> List[Tuple[int]]:
        all_pins_sep_tmp = list(permutations(np.array(ciphers)[:, 0].astype(int)))
        all_pins_sep = []
        guess_indexes = [i for i, val in enumerate(cipher_guess) if val != '']
        for pin_sep in all_pins_sep_tmp:
            valid = True
            for i in guess_indexes:
                if cipher_guess[i] != '' and pin_sep[i] != int(cipher_guess[i]):
                    valid = False
                    break

            if valid:
                all_pins_sep.append(pin_sep)

        return all_pins_sep

    def compute_prob_by_index(self, all_pins_sep: np.ndarray) -> np.ndarray:
        prob_acc_index = np.prod(self.prob_by_index[all_pins_sep, np.arange(all_pins_sep.shape[1])], axis=1)
        sorted_pins_acc_index = np.argsort(prob_acc_index)[::-1]
        return sorted_pins_acc_index

    def compute_prob_by_markov_chain(self, all_pins_sep: np.ndarray) -> np.ndarray:
        prob_acc_markov = np.prod(self.transition_mat[all_pins_sep[:, :-1], all_pins_sep[:, 1:]], axis=1)
        sorted_pins_acc_markov = np.argsort(prob_acc_markov)[::-1]
        return sorted_pins_acc_markov

    def compute_prob_by_frequency(self, all_pins: np.ndarray) -> np.ndarray:
        prob_acc_freq = self.freq[all_pins]
        sorted_pins_acc_freq = np.argsort(prob_acc_freq)[::-1]
        return sorted_pins_acc_freq

    def compute_all_probs(self, cipher_guessing_algorithms: List[str], all_pins_sep: np.ndarray, all_pins: np.ndarray):
        algorithms_probs = []
        if 'index' in cipher_guessing_algorithms:
            algorithms_probs.append(self.compute_prob_by_index(all_pins_sep))

        if 'markov_chain' in cipher_guessing_algorithms:
            algorithms_probs.append(self.compute_prob_by_markov_chain(all_pins_sep))

        if 'frequency' in cipher_guessing_algorithms:
            algorithms_probs.append(self.compute_prob_by_frequency(all_pins))

        return algorithms_probs

    @staticmethod
    def process(ciphers: List[Tuple[int, float]], cipher_guessing_algorithms: List[str], cipher_guess: List[str]) -> List[str]:
        og = OrderGuessing.get_order_guessing_instance(len(ciphers), should_update=True)
        all_pins_sep = og.reduce_permutations_by_guess(ciphers, cipher_guess)
        all_pins = np.array([reduce(lambda x, y: 10 * x + y, pin) for pin in all_pins_sep])
        all_pins_sep = np.array(all_pins_sep)
        n_permutations = len(all_pins)

        algorithms_probs = og.compute_all_probs(cipher_guessing_algorithms, all_pins_sep, all_pins)
        weights = defaultdict(int)

        for rank in range(n_permutations):
            for i in range(len(algorithms_probs)):
                weights[all_pins[algorithms_probs[i][rank]]] += rank

        sorted_weights = sorted(weights.items(), key=lambda item: item[1])
        nth_best_weights = sorted_weights[: min(config['n_more_probable_pins'], n_permutations)]
        more_probable_pins = [pin_code for pin_code, rank in nth_best_weights]

        # as we use numbers, we have to add insignificant zeros
        more_probable_pins = [str(pin).zfill(og.pin_length) for pin in more_probable_pins]
        return more_probable_pins


# use reflection to get the name of the computation methods that start with "compute_prob_by"
algorithms = [method for method in dir(OrderGuessing)
              if callable(getattr(OrderGuessing, method)) and method.startswith("compute_prob_by")]
