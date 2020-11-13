export class NgxIndexedDBService {
    public async getByID<T>(storeName: string, id: string | number): Promise<T> {
        return null;
    }
    public async add<T>(storeName: string, value: T, key?: any): Promise<number> {
        return null;
    }
    public async update<T>(storeName: string, value: T, key?: any): Promise<any> {
        return null;
    }
    public async delete(storeName: string, key: any): Promise<any> {
        return null;
    }
    public async getAll<T>(storeName: string): Promise<T[]> {
        return null;
    }
}

export let dbService = new NgxIndexedDBService();