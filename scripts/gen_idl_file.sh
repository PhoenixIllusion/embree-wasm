#!/bin/bash
set -e

SOURCE_FOLDER=$1

cat "${SOURCE_FOLDER}/types.idl" 

for f in "${SOURCE_FOLDER}"/enum*.idl
do
  cat $f 
done

for f in "${SOURCE_FOLDER}"/struct*.idl
do
  cat $f 
done

echo "[NoDelete]"
echo "interface RTC {";

for f in "${SOURCE_FOLDER}"/_*.idl
do
  cat $f
done

echo "};"
