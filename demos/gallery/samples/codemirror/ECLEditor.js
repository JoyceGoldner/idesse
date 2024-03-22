import { ECLEditor } from "@hpcc-js/codemirror";

const code = `\
MySample := SAMPLE(Person,10,1) // get every 10th record
SomeFile := DATASET([{'A'},{'B'},{'C'},{'D'},{'E'},
                     {'F'},{'G'},{'H'},{'I'},{'J'},
                     {'K'},{'L'},{'M'},{'N'},{'O'},
                     {'P'},{'Q'},{'R'},{'S'},{'T'},
                     {'U'},{'V'},{'W'},{'X'},{'Y'}],
                     {STRING1 Letter});
Set1 := SAMPLE(SomeFile,5,1); // returns A, F, K, P, U`;

new ECLEditor()
    .ecl(code)
    .target("target")
    .render(w => {
        w
            .highlightInfo(0,8)
            .highlightError(12,18)
            .highlightWarning(78,95)
            ;
    })
    ;
