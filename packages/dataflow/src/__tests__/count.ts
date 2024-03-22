import { expect } from "chai";
import { pipe, filter, count, scalar, sensor } from "../index";
import { population } from "./data";

describe("count", () => {

    it("Population", () => {
        const s1 = count();
        const s2 = count();
        const p1 = pipe(
            sensor(s1),
            filter(r => r.age > 30),
            sensor(s2),
        );
        const data = [...p1(population)];
        expect(s1.peek()).to.equal(1000);
        expect(s2.peek()).to.equal(699);
        expect(data.length).to.equal(699);
    });

    it("scalarActivity", () => {
        const countActivity = scalar(count());
        expect(countActivity([5, 1, 2, -3, 4])).to.equal(5);
    });
});
