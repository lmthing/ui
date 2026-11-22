## Purpose

Complete a personal form and keep a local copy of the filled document.

## Pick

Fill named fields tied to a personal PDF or administrative template, check completeness and save a separate local copy. Not standalone input (Field), drawing a signature (Signature), or a client agreement (Agreement).

## Writer

- Use the supplied local:<id> or synthetic lib:<id> template reference. List every named field with kind text, date, number or check. Check values are booleans; number values are decimal strings (for example "12"); date values are real YYYY-MM-DD strings.
- Write null for unspecified values. For a required-only view, use "detail":"brief" and retain all required and optional field definitions. Otherwise leave detail:null.
