import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { config } from '@/config/app.config';
import axios from 'axios';

class HealthController {
  getHealth = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'voxflow-api-gateway',
      version: '1.0.0',
    });
  });

  getDetailedHealth = asyncHandler(async (req: Request, res: Response) => {
    const healthChecks = await Promise.allSettled([
      this.checkPythonService(),
      this.checkRedis(),
      this.checkDatabase(),
    ]);

    const pythonService = healthChecks[0];
    const redis = healthChecks[1];
    const database = healthChecks[2];

    const overallHealth = healthChecks.every(
      check => check.status === 'fulfilled'
    ) ? 'healthy' : 'degraded';

    res.status(overallHealth === 'healthy' ? 200 : 503).json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      service: 'voxflow-api-gateway',
      version: '1.0.0',
      checks: {
        pythonService: {
          status: pythonService.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          message: pythonService.status === 'fulfilled' 
            ? 'Python service is responsive' 
            : `Python service error: ${pythonService.reason}`,
        },
        redis: {
          status: redis.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          message: redis.status === 'fulfilled' 
            ? 'Redis is connected' 
            : `Redis error: ${redis.reason}`,
        },
        database: {
          status: database.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          message: database.status === 'fulfilled' 
            ? 'Database is connected' 
            : `Database error: ${database.reason}`,
        },
      },
    });
  });

  private async checkPythonService(): Promise<boolean> {
    try {
      const response = await axios.get(`${config.pythonService.url}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      throw new Error('Python service unreachable');
    }
  }

  private async checkRedis(): Promise<boolean> {
    // TODO: Implement Redis health check
    return true;
  }

  private async checkDatabase(): Promise<boolean> {
    // TODO: Implement database health check
    return true;
  }
}

export const healthController = new HealthController();