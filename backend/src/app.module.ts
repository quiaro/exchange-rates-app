import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ExchangeRatesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
