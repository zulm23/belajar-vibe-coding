import type { IHealthRepository } from "../domain/repositories/health.repository.interface";
import type { HealthStatus } from "../domain/entities/health.entity";

export class GetHealthUseCase {
  constructor(private readonly healthRepo: IHealthRepository) {}

  async execute(): Promise<HealthStatus> {
    return await this.healthRepo.checkDatabase();
  }
}
