#!/usr/bin/env perl

use strict;
use warnings;
use FindBin qw($RealBin);
use lib "$RealBin/../lib";
use Test::More;

use MorseAlphabet;

# --- decode_char: every letter ---

my %expected_letters = (
    '.-'   => 'A',  '-...'  => 'B',  '-.-.' => 'C',  '-..'  => 'D',
    '.'    => 'E',  '..-.'  => 'F',  '--.'  => 'G',  '....' => 'H',
    '..'   => 'I',  '.---'  => 'J',  '-.-'  => 'K',  '.-..' => 'L',
    '--'   => 'M',  '-.'    => 'N',  '---'  => 'O',  '.--.' => 'P',
    '--.-' => 'Q',  '.-.'   => 'R',  '...'  => 'S',  '-'    => 'T',
    '..-'  => 'U',  '...-'  => 'V',  '.--'  => 'W',  '-..-' => 'X',
    '-.--' => 'Y',  '--..'  => 'Z',
);

for my $morse (sort keys %expected_letters) {
    is(MorseAlphabet::decode_char($morse), $expected_letters{$morse},
       "decode '$morse' -> '$expected_letters{$morse}'");
}

# --- decode_char: every digit ---

my %expected_digits = (
    '-----' => '0',  '.----' => '1',  '..---' => '2',  '...--' => '3',
    '....-' => '4',  '.....' => '5',  '-....' => '6',  '--...' => '7',
    '---..' => '8',  '----.' => '9',
);

for my $morse (sort keys %expected_digits) {
    is(MorseAlphabet::decode_char($morse), $expected_digits{$morse},
       "decode '$morse' -> '$expected_digits{$morse}'");
}

# --- decode_char: unknown sequence ---

is(MorseAlphabet::decode_char('.-.-.-'), undef, "unknown sequence returns undef");
is(MorseAlphabet::decode_char(''),       undef, "empty string returns undef");

# --- encode_char: round-trip every letter ---

for my $morse (sort keys %expected_letters) {
    my $char = $expected_letters{$morse};
    is(MorseAlphabet::encode_char($char), $morse,
       "encode '$char' -> '$morse'");
}

# --- encode_char: round-trip every digit ---

for my $morse (sort keys %expected_digits) {
    my $char = $expected_digits{$morse};
    is(MorseAlphabet::encode_char($char), $morse,
       "encode '$char' -> '$morse'");
}

# --- encode_char: case insensitive ---

is(MorseAlphabet::encode_char('a'), '.-',   "encode lowercase 'a'");
is(MorseAlphabet::encode_char('z'), '--..', "encode lowercase 'z'");

# --- encode_char: uppercase letters work (case insensitivity from both sides) ---

is(MorseAlphabet::encode_char('A'), '.-',   "encode uppercase 'A'");
is(MorseAlphabet::encode_char('Z'), '--..', "encode uppercase 'Z'");

# --- encode_char: empty string returns undef ---

is(MorseAlphabet::encode_char(''), undef, "encode_char('') returns undef");

# --- encode_char: control characters return undef ---

is(MorseAlphabet::encode_char("\t"), undef, "encode_char(tab) returns undef");
is(MorseAlphabet::encode_char("\n"), undef, "encode_char(newline) returns undef");
is(MorseAlphabet::encode_char("\0"), undef, "encode_char(null) returns undef");

# --- alphabet: returns full table ---

my $table = MorseAlphabet::alphabet();
is(ref $table, 'HASH', "alphabet() returns a hashref");
is(scalar keys %$table, 36, "alphabet has 26 letters + 10 digits = 36 entries");

done_testing;
