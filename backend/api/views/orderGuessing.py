from itertools import permutations, product, combinations
from functools import reduce
from typing import *
from collections import defaultdict
import os
from typing import List

import numpy as np
import numpy.typing as npt

from api.config import config
from utils.cipher_to_literal import ciphers_to_literal
from utils.generate_stats import StatsBuilder


class OrderGuessing:
    __instance = None

    @staticmethod
    def get_order_guessing_instance(pin_length: int = 6, should_update: bool = True) -> 'OrderGuessing':
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
        prev_pin_length = OrderGuessing.get_order_guessing_instance(should_update=False).pin_length
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
    def generate_stats(pin_length: int, file_buffer: BinaryIO) -> None:
        try:
            sb = StatsBuilder(file_buffer=file_buffer, expected_pin_len=pin_length)
            sb.save_stats()
        except ValueError as e:
            raise e

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
    def reduce_permutations_by_guess(
            ciphers: npt.NDArray[int],
            ordered_cipher_guesses: List[str]
    ) -> npt.NDArray[npt.NDArray[int]]:

        all_pins_sep_tmp = np.array(list(permutations(ciphers)))
        guess_indexes = [i for i, val in enumerate(ordered_cipher_guesses) if val != '']

        if not guess_indexes:
            return all_pins_sep_tmp

        ordered_guesses = np.array([int(val) if val != '' else -1 for val in ordered_cipher_guesses])
        mask = np.ones(len(all_pins_sep_tmp), dtype=bool)

        for i in guess_indexes:
            mask &= (all_pins_sep_tmp[:, i] == ordered_guesses[i])

        return all_pins_sep_tmp[mask]

    def compute_prob_by_index(
            self,
            all_pins_sep: npt.NDArray[npt.NDArray[int]]
    ) -> npt.NDArray[int]:

        prob_acc_index = np.prod(self.prob_by_index[all_pins_sep, np.arange(all_pins_sep.shape[1])], axis=1)
        sorted_pins_acc_index = np.argsort(prob_acc_index)[::-1]
        return sorted_pins_acc_index

    def compute_prob_by_markov_chain(
            self,
            all_pins_sep: npt.NDArray[npt.NDArray[int]]
    ) -> npt.NDArray[int]:

        prob_acc_markov = np.prod(self.transition_mat[all_pins_sep[:, :-1], all_pins_sep[:, 1:]], axis=1)
        sorted_pins_acc_markov = np.argsort(prob_acc_markov)[::-1]
        return sorted_pins_acc_markov

    def compute_prob_by_frequency(
            self,
            all_pins: npt.NDArray[int]
    ) -> npt.NDArray[int]:

        prob_acc_freq = self.freq[all_pins]
        sorted_pins_acc_freq = np.argsort(prob_acc_freq)[::-1]
        return sorted_pins_acc_freq

    def compute_all_probs(
            self,
            cipher_guessing_algorithms: List[str],
            all_pins_sep: npt.NDArray[npt.NDArray[int]],
            all_pins: npt.NDArray[int]
    ) -> List[npt.NDArray[int]]:

        algorithms_probs = []
        if 'index' in cipher_guessing_algorithms:
            algorithms_probs.append(self.compute_prob_by_index(all_pins_sep))

        if 'markov_chain' in cipher_guessing_algorithms:
            algorithms_probs.append(self.compute_prob_by_markov_chain(all_pins_sep))

        if 'frequency' in cipher_guessing_algorithms:
            algorithms_probs.append(self.compute_prob_by_frequency(all_pins))

        return algorithms_probs

    @staticmethod
    def process(
            ciphers: npt.NDArray[int],
            order_guessing_algorithms: Dict[str, bool],
            order_cipher_guesses: List[str]
    ) -> list[list[str | float]]:

        og = OrderGuessing.get_order_guessing_instance(len(ciphers), should_update=True)
        all_pins_sep = og.reduce_permutations_by_guess(ciphers, order_cipher_guesses)
        all_pins = np.array([reduce(lambda x, y: 10 * x + y, pin) for pin in all_pins_sep])
        all_pins_sep = np.array(all_pins_sep)
        n_permutations = len(all_pins)

        order_guessing_algorithms = [k for k, v in order_guessing_algorithms.items() if v]
        algorithms_probs = og.compute_all_probs(order_guessing_algorithms, all_pins_sep, all_pins)
        weights = defaultdict(int)
        pseudo_probs = defaultdict(float)
        for rank in range(n_permutations):
            for i in range(len(algorithms_probs)):
                weights[all_pins[algorithms_probs[i][rank]]] += rank
                pseudo_probs[all_pins[algorithms_probs[i][rank]]] += algorithms_probs[i][rank]

        sorted_weights = sorted(weights.items(), key=lambda item: item[1])
        nth_best_weights = sorted_weights[: min(config['n_more_probable_pins'], n_permutations)]

        result = [[pin_code, pseudo_probs[pin_code]] for pin_code, _ in nth_best_weights]

        return [[str(pin).zfill(og.pin_length), pseudo_probs[pin]] for pin, pseudo_prob in result]

    @staticmethod
    def case_handler(
            ciphers_and_probs: npt.NDArray[Tuple[int, float]],
            order_guessing_algorithms: Dict[str, bool],
            order_cipher_guesses: List[str]
    ) -> List[str]:

        ciphers: npt.NDArray[[Tuple[int, float]]] = ciphers_and_probs[:, 0].astype(int)
        expected_length = len(order_cipher_guesses)

        delta_length = expected_length - len(ciphers)
        required_ciphers = np.array([int(cipher) for cipher in order_cipher_guesses if cipher != '' and
                                     int(cipher) not in ciphers])

        if delta_length > 0:
            missing_length = delta_length
            missing_possibilities = np.array(list(product(range(10), repeat=missing_length)))

            # Create a boolean mask for valid sequences
            valid_mask = np.ones(len(missing_possibilities), dtype=bool)
            for required_cipher in required_ciphers:
                valid_mask &= np.any(missing_possibilities == required_cipher, axis=1)

            new_sequences = np.array([
                np.concatenate((ciphers, missing)) for missing in missing_possibilities[valid_mask]
            ])

        elif delta_length < 0:
            all_combinations = np.array(list(combinations(ciphers, expected_length)))
            mask = np.ones(len(all_combinations), dtype=bool)

            for required_cipher in required_ciphers:
                mask &= np.any(all_combinations == required_cipher, axis=1)

            new_sequences = all_combinations[mask]
        else:
            new_sequences = np.array([ciphers])

        best_mean = 0
        best_sequences = []
        for i, sequence in enumerate(new_sequences):
            result = OrderGuessing.process(sequence, order_guessing_algorithms, order_cipher_guesses)
            mean = np.mean([float(prob) for _, prob in result])
            if mean > best_mean:
                best_mean = mean
                best_sequences = [ciphers for ciphers, _ in result]

        return best_sequences


# use reflection to get the name of the computation methods that start with the following prefix
prefix = "compute_prob_by_"
algorithms = [method.removeprefix(prefix) for method in dir(OrderGuessing)
              if callable(getattr(OrderGuessing, method)) and method.startswith(prefix)]
