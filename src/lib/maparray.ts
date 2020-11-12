export class MapArray<K,V> {
    private map = new Map<K,V[]>();

    public forEach(x) {
        this.map.forEach(x);
    }

    public get(k:K) : V[] {
        return this.map.get(k);
    }

    public set(k:K, v:V[]) {
        this.map.set(k,v);
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
