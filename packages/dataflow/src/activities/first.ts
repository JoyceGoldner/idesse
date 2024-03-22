import { IterableActivity, isSource, Source } from "./activity";

function firstGen<T = any>(n: number): IterableActivity<T, T> {
    return function* (source: Source<T>) {
        let i = 0;
        for (const item of source) {
            yield item;
            if (++i >= n) {
                break;
            }
        }
    };
}

export function first<T = any>(n: number): IterableActivity<T, T>;
export function first<T>(source: Source<T>, n: number): IterableIterator<T>;
export function first<T = any>(s_or_n: Source<T> | number, n?: number): IterableActivity<T, T> | IterableIterator<T> {
    if (!isSource(s_or_n)) return firstGen<T>(s_or_n);
    return firstGen<T>(n!)(s_or_n);
}
