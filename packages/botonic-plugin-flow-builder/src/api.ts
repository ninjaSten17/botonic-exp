import { Input, PluginPreRequest } from '@botonic/core'
import axios from 'axios'

import {
  HtFallbackNode,
  HtFlowBuilderData,
  HtIntentNode,
  HtKeywordNode,
  HtNodeComponent,
  HtNodeStartType,
  HtNodeWithContent,
  HtNodeWithContentType,
  HtStartNode,
} from './content-fields/hubtype-fields'
import { FlowBuilderApiOptions } from './types'

export class FlowBuilderApi {
  url: string
  flow: HtFlowBuilderData
  request: PluginPreRequest

  private constructor() {}

  static async create(options: FlowBuilderApiOptions): Promise<FlowBuilderApi> {
    const newApi = new FlowBuilderApi()

    newApi.url = options.url
    newApi.flow = options.flow ?? (await newApi.getFlow(options.accessToken))
    newApi.request = options.request

    return newApi
  }

  private async getFlow(token: string): Promise<HtFlowBuilderData> {
    const { data } = await axios.get(this.url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data as HtFlowBuilderData
  }

  getNodeById<T extends HtNodeComponent>(id: string): T {
    const node = this.flow.nodes.find(node => node.id === id)
    if (!node) throw Error(`Node with id: '${id}' not found`)
    return node as T
  }

  getNodeByCode(code: string): HtNodeComponent {
    const content = this.flow.nodes.find(node =>
      'code' in node ? node.code === code : false
    )
    if (!content) throw Error(`Node with code: '${code}' not found`)
    return content
  }

  getStartNode(): HtNodeWithContent {
    const startUpNode = this.flow.nodes.find(
      node => node.type === HtNodeStartType.STARTUP
    ) as HtStartNode | undefined
    if (!startUpNode) throw new Error('Start-up id must be defined')
    return this.getNodeById(startUpNode.target.id)
  }

  getFallbackNode(alternate: boolean): HtNodeWithContent {
    const fallbackNode = this.flow.nodes.find(
      node => node.type === HtNodeWithContentType.FALLBACK
    ) as HtFallbackNode | undefined
    if (!fallbackNode) {
      throw new Error('Fallback node must be defined')
    }
    const fallbackFirstMessage = fallbackNode.content.first_message
    if (!fallbackFirstMessage) {
      throw new Error('Fallback 1st message must be defined')
    }
    const fallbackSecondMessage = fallbackNode.content.second_message
    if (!fallbackSecondMessage) {
      return this.getNodeById(fallbackFirstMessage.id)
    }
    return alternate
      ? this.getNodeById(fallbackFirstMessage.id)
      : this.getNodeById(fallbackSecondMessage.id)
  }

  getIntentNode(input: Input, locale: string): HtIntentNode | undefined {
    try {
      const intentsNodes = this.flow.nodes.filter(
        node => node.type === HtNodeWithContentType.INTENT
      ) as HtIntentNode[]
      const inputIntent = input.intent
      if (inputIntent) {
        return intentsNodes.find(
          node =>
            inputIntent && this.nodeContainsIntent(node, inputIntent, locale)
        )
      }
    } catch (error) {
      console.error(`Error getting node by intent '${input.intent}': `, error)
    }

    return undefined
  }

  private nodeContainsIntent(
    node: HtIntentNode,
    intent: string,
    locale: string
  ): boolean {
    return node.content.intents.some(
      i => i.locale === locale && i.values.includes(intent)
    )
  }

  hasMetConfidenceThreshold(
    node: HtIntentNode,
    predictedConfidence: number
  ): boolean {
    const nodeConfidence = node.content.confidence / 100
    return predictedConfidence >= nodeConfidence
  }

  getNodeByKeyword(
    userInput: string,
    locale: string
  ): HtNodeWithContent | undefined {
    try {
      const keywordNodes = this.flow.nodes.filter(
        node => node.type == HtNodeWithContentType.KEYWORD
      ) as HtKeywordNode[]
      const matchedKeywordNodes = keywordNodes.filter(node =>
        this.matchKeywords(node, userInput, locale)
      )
      if (matchedKeywordNodes.length > 0 && matchedKeywordNodes[0].target) {
        return this.getNodeById<HtNodeWithContent>(
          matchedKeywordNodes[0].target.id
        )
      }
    } catch (error) {
      console.error(`Error getting node by keyword '${userInput}': `, error)
    }

    return undefined
  }

  private matchKeywords(
    node: HtKeywordNode,
    input: string,
    locale: string
  ): boolean {
    const result = node.content.keywords.find(
      i => i.locale === locale && this.containsAnyKeywords(input, i.values)
    )
    return Boolean(result)
  }

  private containsAnyKeywords(input: string, keywords: string[]): boolean {
    return keywords.some(keyword => input.includes(keyword))
  }
}
