#!/usr/bin/env perl

use strict;
use warnings;
use FindBin qw($RealBin);
use lib "$RealBin/../lib";
use Test::More;

use MorseEncoder;
use MorseDecoder;

# --- Sample outputs from problem statement (encode the expected English) ---

is(MorseEncoder::encode_line('dog'),
   '-..||---||--.', 'sample 1: dog encodes correctly');

is(MorseEncoder::encode_line('hello world'),
   '....||.||.-..||.-..||---||||.--||---||.-.||.-..||-..', 'sample 2: hello world encodes correctly');

# --- Single character ---

is(MorseEncoder::encode_line('a'), '.-',   'single letter: a');
is(MorseEncoder::encode_line('t'), '-',    'single letter: t');
is(MorseEncoder::encode_line('e'), '.',    'single letter: e');
is(MorseEncoder::encode_line('o'), '---',  'single letter: o');

# --- Single digit ---

is(MorseEncoder::encode_line('1'), '.----', 'single digit: 1');
is(MorseEncoder::encode_line('0'), '-----', 'single digit: 0');

# --- Case insensitive input ---

is(MorseEncoder::encode_line('DOG'),
   '-..||---||--.', 'uppercase input produces same encoding');

is(MorseEncoder::encode_line('DoG'),
   '-..||---||--.', 'mixed case input produces same encoding');

# --- Delimiter structure ---

# Word boundary should be ||||
like(MorseEncoder::encode_line('a b'), qr/\|\|\|\|/, 'word boundary uses ||||');

# Letter boundary should be ||
like(MorseEncoder::encode_line('ab'), qr/\.\-\|\|\-\.\.\./, 'letter boundary uses ||');

# --- Multiple words ---

my $three_words = MorseEncoder::encode_line('a b c');
my @words = split /\|\|\|\|/, $three_words;
is(scalar @words, 3, 'three words produce three segments');
is($words[0], '.-',   'first word: a');
is($words[1], '-...', 'second word: b');
is($words[2], '-.-.', 'third word: c');

# --- Round-trip: encode then decode every letter ---

for my $char ('a'..'z') {
    my $encoded = MorseEncoder::encode_line($char);
    my $decoded = MorseDecoder::decode_line($encoded);
    is($decoded, $char, "round-trip letter: '$char'");
}

# --- Round-trip: encode then decode every digit ---

for my $digit ('0'..'9') {
    my $encoded = MorseEncoder::encode_line($digit);
    my $decoded = MorseDecoder::decode_line($encoded);
    is($decoded, $digit, "round-trip digit: '$digit'");
}

# --- Round-trip: words and phrases ---

my @phrases = (
    'sos',
    'hello world',
    'the quick brown fox',
    '2024',
    'r2d2',
    'the quick brown fox jumps over the lazy dog',
    'a b c d e f g',
);

for my $phrase (@phrases) {
    my $encoded = MorseEncoder::encode_line($phrase);
    my $decoded = MorseDecoder::decode_line($encoded);
    is($decoded, $phrase, "round-trip phrase: '$phrase'");
}

# --- Whitespace handling ---

is(MorseEncoder::encode_line('  hello'), '....||.||.-..||.-..||---',
   'leading whitespace is ignored');

is(MorseEncoder::encode_line('hello  '), '....||.||.-..||.-..||---',
   'trailing whitespace is ignored');

is(MorseEncoder::encode_line('hello  world'),
   '....||.||.-..||.-..||---||||.--||---||.-.||.-..||-..', 'multiple internal spaces treated as single word boundary');

# --- Empty input ---

is(MorseEncoder::encode_line(''), '', 'empty string encodes to empty string');

# --- Error: unencodable character ---

eval { MorseEncoder::encode_line('hello!') };
like($@, qr/No Morse encoding for character/, 'dies on unencodable character: !');

eval { MorseEncoder::encode_line('test@home') };
like($@, qr/No Morse encoding for character/, 'dies on unencodable character: @');

# --- encode_line(undef): returns empty string (with warning) ---

{
    # Suppress "uninitialized" warning for this test
    local $SIG{__WARN__} = sub {};
    is(MorseEncoder::encode_line(undef), '', 'encode_line(undef) returns empty string');
}

# --- More invalid characters ---

my @invalid_chars = (
    ['-',  'hyphen'],
    ['.',  'period'],
    [',',  'comma'],
    ["'",  'apostrophe'],
    ['?',  'question mark'],
    ['/',  'slash'],
);

for my $pair (@invalid_chars) {
    my ($ch, $name) = @$pair;
    eval { MorseEncoder::encode_line($ch) };
    like($@, qr/No Morse encoding for character/,
         "dies on unencodable character: $name ($ch)");
}

# --- Tab in input: treated as word boundary (Perl split ' ' splits on any whitespace) ---

is(MorseEncoder::encode_line("A\tB"),
   '.-||||-...', 'tab treated as word boundary between A and B');

# --- Single space input: returns empty string ---

is(MorseEncoder::encode_line(' '), '', 'single space encodes to empty string');

# --- Reverse round-trip: decode(encode(text)) eq lc(text) ---

my @roundtrip_phrases = (
    'hello',
    'morse code',
    'the quick brown fox',
    '42',
    'abc 123 xyz',
    'a',
    's o s',
);

for my $phrase (@roundtrip_phrases) {
    my $encoded = MorseEncoder::encode_line($phrase);
    my $decoded = MorseDecoder::decode_line($encoded);
    is($decoded, lc($phrase),
       "reverse round-trip: decode(encode('$phrase')) eq lc('$phrase')");
}

done_testing;
