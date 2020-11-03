export class MapArray<K,V> {
    private map = new Map<K,V[]>();

    public foreach(x) {
        this.map.forEach(x);
    }

    public get(k:K) : V[] {
        return this.map.get(k);
    }

    public add(k:K, v:V) {
        let w : V[] = this.map.get(k);
        if (w==null) {
            w = [];
            this.map.set(k,w);
        }
        if (!w.includes(v)) {
            w.push(v);
        }
    }
}
