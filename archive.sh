#!/bin/bash

CHECKIN_ID=${1:?"CHECKIN_ID Required"}

shopt -s nullglob
for i in store/full/checkins/*"$CHECKIN_ID"* store/push/checkins/*"$CHECKIN_ID"* store/checkins/*"$CHECKIN_ID"*; do
	echo "$i -> ${i/store/store/deleted}"
	mv "$i" "${i/store/store/deleted}"
done;
shopt -u nullglob
