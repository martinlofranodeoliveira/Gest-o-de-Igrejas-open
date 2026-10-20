import { IDataRepository } from '../types';

export class DataImporter {
  constructor(
    private sourceRepository: IDataRepository<any>,
    private targetRepository: IDataRepository<any>
  ) {}

  async importData(): Promise<void> {
    const data = await this.sourceRepository.getAll();
    for (const item of data) {
      const { id, ...dataWithoutId } = item;
      await this.targetRepository.add(dataWithoutId);
    }
  }

  async importFromJson(jsonData: any[]): Promise<void> {
    for (const item of jsonData) {
      // Ensure we remove ID if it exists to avoid conflicts
      const { id, ...dataWithoutId } = item;
      await this.targetRepository.add(dataWithoutId);
    }
  }
}
