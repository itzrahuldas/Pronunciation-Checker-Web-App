import pronouncing
from g2p_en import G2p
import string

g2p = G2p()

def get_phonemes(word: str) -> str:
    """Returns the ARPAbet phonemes for a given English word."""
    clean_word = word.strip(string.punctuation).lower()
    if not clean_word:
        return ""
    
    # Check CMU dict
    phones = pronouncing.phones_for_word(clean_word)
    if phones:
        return phones[0]
    
    # Fallback to g2p-en for out-of-vocabulary words
    g2p_phones = g2p(clean_word)
    return " ".join([p for p in g2p_phones if p.strip()])

def extract_phonemes_dict(text: str) -> dict:
    """Extracts phonemes for each word in a string, returned as a dictionary."""
    phonemes_dict = {}
    for word in text.split():
        clean = word.strip(string.punctuation).lower()
        if clean:
            phonemes_dict[clean] = get_phonemes(clean)
    return phonemes_dict
