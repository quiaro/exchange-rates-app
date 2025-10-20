import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExchangeRatesController } from './exchange-rates.controller';
import { FinnhubService } from '../../services/finnhub/finnhub.service';
import { FinnhubMockService } from '../../services/finnhub/finnhub-mock.service';

const providers = [
  {
    provide: FinnhubService,
    useClass:
      process.env.NODE_ENV === 'development'
        ? FinnhubMockService
        : FinnhubService,
  },
];

@Module({
  imports: [ConfigModule],
  controllers: [ExchangeRatesController],
  providers,
})
export class ExchangeRatesModule {}
