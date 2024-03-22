import { expect } from "chai";
import { bundle } from "./dts-bundle";
import { existsSync, readFile, readFileSync } from "fs";
import * as glob from "glob";

const NODEJS_DEPENDENCY_EXCEPTIONS = ["node-fetch", "abort-controller", "safe-buffer", "@xmldom/xmldom", "tmp"];
const EXTERNAL_EXCEPTIONS = ["preact/hooks"];

function calcExternals(main: string = "types/index.d.ts", out: string = "dist/index.d.ts") {
    const bundleInfo: any = bundle({
        name: "__dummy__",
        baseDir: ".",
        main,
        out,
        outputAsModuleFolder: true,
        headerPath: "",
        headerText: ""
    });
    const externals: string[] = [];
    for (const key in bundleInfo.fileMap) {
        for (const external of bundleInfo.fileMap[key].externalImports) {
            if (externals.indexOf(external) < 0) {
                externals.push(external);
            }
        }
    }
    return externals;
}

describe("Types", function () {
    it("tsc 2.9.x import issue", function (done) {
        //  Check for types exported from packages that do not exist in the dependcies list.
        glob("../../packages/*/types/*.d.ts", {}, function (er: any, files: any) {
            Promise.all(files.map((f: any) => {
                return new Promise<void>((resolve, reject) => {
                    readFile(f, "utf8", function (err: any, data: any) {
                        if (err) throw err;
                        //  Check for invalid "import(" statements - typescript issue in 2.9.x
                        expect(data.indexOf('import("'), f).to.equal(-1);
                        resolve();
                    });
                });
            })).then(() => {
                done();
            });
        });
    });

    it("dependencies", function (done) {
        //  Check for types exported from packages that do not exist in the dependcies list.
        glob("../../packages/*/", {}, function (er: any, folders: any) {
            Promise.all(folders.filter((folder: string) => folder.indexOf("codemirror-shim") < 0).map((folder: any) => {
                return new Promise<void>((resolve, reject) => {
                    const pkg = JSON.parse(readFileSync(`${folder}package.json`, "utf8"));
                    if (pkg.module && pkg.module.indexOf("lib-es6/") === 0) {
                        // Loose es6 files need all dependencies  ---
                        resolve();
                    } else {
                        glob(`${folder}types/**/*.d.ts`, {}, function (err: any, files: any) {
                            if (err) throw err;
                            let typePath = `${folder}types/index.node.d.ts`;
                            if (!existsSync(typePath)) {
                                typePath = `${folder}types/index.d.ts`;
                            }
                            if (existsSync(typePath)) {
                                const externals = calcExternals(typePath, `tmp/${pkg.name}`);
                                externals.filter(external => EXTERNAL_EXCEPTIONS.indexOf(external) < 0).forEach(external => {
                                    if (pkg.name.indexOf("-shim") < 0 && (!pkg.dependencies || (!pkg.dependencies[external] && !pkg.dependencies["@types/" + external]))) {
                                        expect(false, `${pkg.name}:${folder} missing dependency:  ${external}`).to.be.true;
                                    }
                                });
                                for (const key in pkg.dependencies) {
                                    const deps = key.indexOf("@types/") === 0 ? key.substr(7) : key;
                                    if (NODEJS_DEPENDENCY_EXCEPTIONS.indexOf(deps) < 0 && key.indexOf("@hpcc-js") < 0 && externals.indexOf(deps) < 0) {
                                        expect(false, `${pkg.name}:${folder} extraneous dependency:  ${deps}`).to.be.true;
                                    }
                                }
                            }
                            resolve();
                        });
                    }
                });
            })).then(() => {
                done();
            });
        });
    });
});
