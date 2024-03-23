OUT=build/embree.idl

cat idl/types.idl > $OUT

for f in idl/enum*.idl
do
  cat $f >> $OUT
done

for f in idl/struct*.idl
do
  cat $f >> $OUT
done

echo "[NoDelete]" >> $OUT
echo "interface RTC {" >> $OUT;

for f in idl/_*.idl
do
  cat $f >> $OUT
done

echo "};" >> $OUT;