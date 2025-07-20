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

    // Get Python service model info
    let modelInfo = {
      name: 'Unknown',
      status: 'error' as 'loaded' | 'loading' | 'error'
    };
    
    try {
      if (pythonService.status === 'fulfilled') {
        const modelResponse = await axios.get(`${config.pythonService.url}/models/status`, {
          timeout: 3000,
        });
        if (modelResponse.data) {
          modelInfo = {
            name: modelResponse.data.model_name || 'Mistral Voxtral-Mini-3B-2507',
            status: modelResponse.data.loaded ? 'loaded' : 'loading'
          };
        }
      }
    } catch (error) {
      // Model info will stay as error
    }

    // Count healthy services
    const healthyServices = healthChecks.filter(check => check.status === 'fulfilled').length;
    const totalServices = 3;
    
    // Get real system memory info
    const totalMemory = require('os').totalmem();
    const memoryInfo = {
      used: Math.round(process.memoryUsage().rss),
      total: Math.round(totalMemory),
      percentage: Math.round((process.memoryUsage().rss / totalMemory) * 100)
    };

    // Return SystemStatus format expected by frontend
    res.status(200).json({
      model: {
        name: modelInfo.name,
        status: modelInfo.status,
        memoryUsage: 2.1
      },
      hardware: {
        name: 'Apple Silicon M4 Max',
        status: 'active' as 'active' | 'idle' | 'error',
        utilization: 45
      },
      services: {
        total: totalServices,
        healthy: healthyServices,
        status: healthyServices === totalServices ? 'healthy' : 'degraded' as 'healthy' | 'degraded' | 'error'
      },
      memory: memoryInfo
    });
  });

  private async checkPythonService(): Promise<boolean> {
    try {
      const response = await axios.get(`${config.pythonService.url}/health/`, {
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