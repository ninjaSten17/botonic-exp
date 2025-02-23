import { Environments } from '../..'

export function botExecutorHandlerFactory(env, botExecutor) {
  if (env === Environments.LOCAL) return botExecutor
  if (env === Environments.AWS) {
    return async function (event, context) {
      try {
        const params = JSON.parse(event.Records[0].body)
        await botExecutor(params)
      } catch (e) {
        console.error(e)
        return {
          statusCode: 500,
        }
      }
      return {
        statusCode: 200,
      }
    }
  }
}
