import inflect
import inspect
import sys
from itertools import permutations
from functools import reduce
from typing import *
from collections import defaultdict

import numpy as np

from api.config import config


def compute_prob_by_index(all_pins_sep: np.ndarray) -> np.ndarray:
    prob_acc_index = np.prod(prob_by_index[all_pins_sep, np.arange(all_pins_sep.shape[1])], axis=1)
    sorted_pins_acc_index = np.argsort(prob_acc_index)[::-1]
    return sorted_pins_acc_index


def compute_prob_by_markov_chain(all_pins_sep: np.ndarray) -> np.ndarray:
    prob_acc_markov = np.prod(transition_mat[all_pins_sep[:, :-1], all_pins_sep[:, 1:]], axis=1)
    sorted_pins_acc_markov = np.argsort(prob_acc_markov)[::-1]
    return sorted_pins_acc_markov


def compute_prob_by_frequency(all_pins: np.ndarray) -> np.ndarray:
    prob_acc_freq = freq[all_pins]
    sorted_pins_acc_freq = np.argsort(prob_acc_freq)[::-1]
    return sorted_pins_acc_freq


def guess_order(ciphers: List[Tuple[int, float]], _algorithms: Set[str]) -> List[str]:
    """
    Use probabilities computed from a large sample of PIN code defined by:
        -> a Markov chain's transition matrix (order=1)
        -> a matrix that gives the probabilities of each cipher to be at each index
            in the sequence
        -> a simple frequency array

    As these methods doesn't provide equivalent distribution we cannot compute a mean
    probability directly. Thus, we sum all the ranks of the permutations according to
    the previous methods and then take the nth first more probable sequence
    """

    if len(ciphers) != config['pin_length']:
        return []

    all_pins_sep = list(permutations(np.array(ciphers)[:, 0].astype(int)))
    all_pins = np.array([reduce(lambda x, y: 10 * x + y, pin) for pin in all_pins_sep])
    all_pins_sep = np.array(all_pins_sep)
    n_permutations = len(all_pins)

    weights = defaultdict(int)

    algorithms_probs = []
    if 'index' in _algorithms:
        algorithms_probs.append(compute_prob_by_index(all_pins_sep))

    if 'markov_chain' in _algorithms:
        algorithms_probs.append(compute_prob_by_markov_chain(all_pins_sep))

    if 'frequency' in _algorithms:
        algorithms_probs.append(compute_prob_by_frequency(all_pins))

    for rank in range(n_permutations):
        for i in range(len(algorithms_probs)):
            weights[all_pins[algorithms_probs[i][rank]]] += rank

    sorted_weights = sorted(weights.items(), key=lambda item: item[1])
    nth_best_weights = sorted_weights[: min(config['n_more_probable_pins'], n_permutations)]
    more_probable_pins = [pin_code for pin_code, rank in nth_best_weights]

    # as we use numbers, we have to add insignificant zeros
    more_probable_pins = [str(pin).zfill(config['pin_length']) for pin in more_probable_pins]
    return more_probable_pins


# get all the algorithm names by inspecting the members in the current module
prefix = 'compute_prob_by_'
members = inspect.getmembers(sys.modules[__name__])
algorithms = [name.removeprefix(prefix) for name, obj in members
              if inspect.isfunction(obj) and name.startswith(prefix)]
# get the literal cipher of the PIN length
p = inflect.engine()
pin_length_lit = p.number_to_words(config['pin_length'])
for k, v in config["OrderGuessing"].items():
    config["OrderGuessing"][k] = v.replace("###", pin_length_lit)

# numpy raises exception already no need to check
transition_mat = np.load(config["OrderGuessing"]["transition_matrix"], allow_pickle=True)
prob_by_index = np.load(config["OrderGuessing"]["prob_by_index"], allow_pickle=True)
freq = np.load(config["OrderGuessing"]["frequencies"], allow_pickle=True)
