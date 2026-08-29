import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { readApiPort } from './kernel/configuration.js'

const app = await NestFactory.create(AppModule)
app.setGlobalPrefix('v1')
app.enableShutdownHooks()

const port = readApiPort(process.env.API_PORT)
await app.listen(port, process.env.API_HOST ?? '127.0.0.1')
