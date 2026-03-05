#!/usr/bin/env perl

use strict;
use warnings;
use FindBin qw($RealBin);
use lib "$RealBin/../lib";
use Test::More;

use MorseAlphabet;
use MorseDecoder;

# Helper: encode a word to Morse (letters joined by ||).
sub morse_word {
    my ($word) = @_;
    return join '||', map {
        MorseAlphabet::encode_char($_) // die "No Morse for '$_'"
    } split //, $word;
}

# Helper: encode a phrase to Morse (words joined by ||||).
sub morse_phrase {
    my ($phrase) = @_;
    return join '||||', map { morse_word($_) } split / /, $phrase;
}

# --- Sample inputs from problem statement ---

is(MorseDecoder::decode_line('-..||---||--.'),
   'dog', 'sample 1: dog');

is(MorseDecoder::decode_line('....||.||.-..||.-..||---||||.--||---||.-.||.-..||-..'),
   'hello world', 'sample 2: hello world');

# --- Single character ---

is(MorseDecoder::decode_line('.-'),   'a', 'single letter: a');
is(MorseDecoder::decode_line('-'),    't', 'single letter: t');
is(MorseDecoder::decode_line('.'),    'e', 'single letter: e');
is(MorseDecoder::decode_line('---'),  'o', 'single letter: o');

# --- Single digit ---

is(MorseDecoder::decode_line('.----'), '1', 'single digit: 1');
is(MorseDecoder::decode_line('-----'), '0', 'single digit: 0');

# --- Numeric strings ---

is(MorseDecoder::decode_line(morse_phrase('2024')),
   '2024', 'numeric string: 2024');

is(MorseDecoder::decode_line(morse_phrase('90210')),
   '90210', 'numeric string: 90210');

# --- Mixed alpha-numeric ---

is(MorseDecoder::decode_line(morse_word('a1')),
   'a1', 'mixed alpha-numeric: a1');

is(MorseDecoder::decode_line(morse_phrase('r2d2')),
   'r2d2', 'mixed alpha-numeric: r2d2');

# --- Multiple words ---

is(MorseDecoder::decode_line(morse_phrase('the quick')),
   'the quick', 'two words: the quick');

is(MorseDecoder::decode_line(morse_phrase('hello world foo')),
   'hello world foo', 'three words');

is(MorseDecoder::decode_line(morse_phrase('a b c d')),
   'a b c d', 'four single-letter words');

# --- Full pangram (exercises every letter) ---

is(MorseDecoder::decode_line(morse_phrase('the quick brown fox jumps over the lazy dog')),
   'the quick brown fox jumps over the lazy dog',
   'full pangram: exercises all 26 letters');

# --- Output is always lowercase ---

is(MorseDecoder::decode_line('...||---||...'),
   'sos', 'output is lowercase');

# --- All digits in sequence ---

is(MorseDecoder::decode_line(morse_word('1234567890')),
   '1234567890', 'all digits 0-9');

# --- Round-trip: every letter individually ---

for my $char ('a'..'z') {
    my $morse = morse_word($char);
    is(MorseDecoder::decode_line($morse), $char,
       "round-trip decode: '$char'");
}

# --- Round-trip: every digit individually ---

for my $digit ('0'..'9') {
    my $morse = morse_word($digit);
    is(MorseDecoder::decode_line($morse), $digit,
       "round-trip decode: '$digit'");
}

# --- Empty input ---

is(MorseDecoder::decode_line(''), '', 'empty string decodes to empty string');

# --- Error: unknown sequence ---

eval { MorseDecoder::decode_line('.-.-.-.-.-') };
like($@, qr/Unknown Morse sequence/, 'dies on unknown Morse sequence');

eval { MorseDecoder::decode_line('.-||.-.-.-.-.-||-...') };
like($@, qr/Unknown Morse sequence/, 'dies on unknown sequence mid-word');

# --- decode_line(undef): returns empty string (with warning) ---

{
    local $SIG{__WARN__} = sub {};
    is(MorseDecoder::decode_line(undef), '', 'decode_line(undef) returns empty string');
}

# --- Malformed delimiters: "||||" (just word separators, no content) ---
# split discards trailing empties, so "||||" splits to empty list -> empty result

is(MorseDecoder::decode_line('||||'), '',
   'decode_line("||||") returns empty string (only word separator)');

# --- Leading separator: "||||.-" produces leading space ---
# split /\|\|\|\|/, "||||.-" -> ("", ".-")
# The empty first word produces "" (no letters), then join adds a space before "a"

is(MorseDecoder::decode_line('||||.-'), ' a',
   'leading |||| produces leading space before decoded content');

# --- Trailing separator: ".-||||" drops trailing empty word ---
# split /\|\|\|\|/, ".-||||" -> (".-") (Perl discards trailing empties)

is(MorseDecoder::decode_line('.-||||'), 'a',
   'trailing |||| is ignored (Perl split discards trailing empties)');

# --- Reverse round-trip from decode side: encode(decode(morse)) eq morse ---

use MorseEncoder;

my @morse_strings = (
    '-..||---||--.', # dog
    '....||.||.-..||.-..||---||||.--||---||.-.||.-..||-..', # hello world
    '...||---||...', # sos
    '.-',  # a
    '.----||..---||...--', # 123
    '...||---||...||||..||...', # sos is (two words)
);

for my $morse (@morse_strings) {
    my $decoded  = MorseDecoder::decode_line($morse);
    my $reencoded = MorseEncoder::encode_line($decoded);
    is($reencoded, $morse,
       "reverse round-trip: encode(decode('$morse')) reproduces original morse");
}

done_testing;
