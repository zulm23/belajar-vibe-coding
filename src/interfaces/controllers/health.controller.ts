import { GetHealthUseCase } from "../../use-cases/get-health.use-case";

export class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  async getHealth() {
    const health = await this.getHealthUseCase.execute();
    return {
      success: true,
      data: health,
    };
  }
}
