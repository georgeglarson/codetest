# MorseCode

A Perl solution for translating between Morse code and English.

## Approach

Splits input on the delimiter hierarchy (`||||` for word boundaries, `||` for letter boundaries), then maps each Morse sequence through a lookup table. The encoder reverses the process. Clean string splitting, no regex needed for the core logic.

## Structure

```
lib/
  MorseAlphabet.pm   # Lookup table: Morse ↔ character
  MorseDecoder.pm    # Morse → English: delimiter parsing + alphabet lookup
  MorseEncoder.pm    # English → Morse: text splitting + alphabet lookup
t/
  alphabet.t         # 78 tests: encode/decode every letter & digit, edge cases
  decoder.t          # 57 tests: samples, round-trips, multi-word, error handling
  encoder.t          # 65 tests: samples, round-trips, case handling, whitespace, error paths
morse_decode         # CLI: Morse → English
morse_encode         # CLI: English → Morse
```

## Run

```sh
# requires perl 5.10+
./morse_decode input.txt    # Morse → English
./morse_encode english.txt  # English → Morse

# full round-trip
echo "hello world" | ./morse_encode /dev/stdin | ./morse_decode /dev/stdin
```

## Test

```sh
make test
```

200 tests across three suites covering every character in the Morse alphabet, bidirectional round-trip encode/decode for all 36 characters, multi-word phrases, a full pangram, numeric strings, mixed alpha-numeric input, case insensitivity, delimiter structure, and error paths for invalid input.

## Design Considerations

- **Alphabet isolation**: The lookup table is a standalone module. Swapping to a different encoding (e.g., NATO phonetic) means replacing one file.
- **Bidirectional symmetry**: Encoder and decoder are full mirrors of each other, both backed by the same alphabet. `decode(encode(text)) == text` is verified for every character.
- **Extensibility**: The delimiter scheme is handled in the encoder/decoder modules, separate from the alphabet. Changing the wire format doesn't touch the character mappings.
