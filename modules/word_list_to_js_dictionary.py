#!/usr/bin/python3

import argparse
import sys
import os.path
import re


EXIT_SUCCESS = 0

def main():
	parser = argparse.ArgumentParser(
		"Convert a word list (single column, in a text file)" +
	 	"to a JavaScript dictionary, skipping capitalized words or words ending with an \"'s\".")
	parser.add_argument('text_file', metavar='F', type=str, help='Path to text file with words in a single column.')
	parser.add_argument('-o','--output', type=str, default=None, help='Path to the output file.')
	args = parser.parse_args()
	text_file = args.text_file
	output_file = args.output
	if output_file is None:
		output_file = os.path.splitext(os.path.basename(text_file))[0] + ".js"

	input_file = open(text_file, 'r')
	words = input_file.readlines()

	output_file = open(output_file, 'w')

	unfit_characters_pattern = re.compile(r"[A-Z]|[']|[`]|[+]|[=]")
	output_file.write("let usEnglishWordList = \"")
	output_string = ""
	for word in words:
		word = word.strip()
		if unfit_characters_pattern.search(word) is None:
			output_string += (word + "|")
	output_string = output_string[0:-1]
	output_file.write(output_string)
	output_file.write("\";\n")
	output_file.write("usEnglishWordList = new Set(usEnglishWordList.split('|'));")

	return EXIT_SUCCESS

if __name__ == "__main__":
	sys.exit(main())