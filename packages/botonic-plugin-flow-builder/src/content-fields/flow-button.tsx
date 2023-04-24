import { Button, Reply } from '@botonic/react'
import React from 'react'

import { Button as FbButton, ButtonStyle } from '../flow-builder-models'
import { ContentFieldsBase } from './content-fields-base'

export class FlowButton extends ContentFieldsBase {
  public text = ''
  public url?: string
  public payload?: string

  static fromHubtypeCMS(component: FbButton, locale: string): FlowButton {
    const newButton = new FlowButton(component.id)
    newButton.text = FlowButton.getTextByLocale(locale, component.text)
    newButton.payload = component.target
      ? component.target.id
      : component.payload?.find(payload => payload.locale === locale)?.id
    if (component.url) {
      const urlButton = (component.url as any).find(
        url => url.locale === locale
      )
      if (urlButton) newButton.url = urlButton.content.url
    }
    return newButton
  }

  renderButton(id: string, buttonStyle: ButtonStyle): JSX.Element {
    if (buttonStyle === ButtonStyle.QUICK_REPLY) {
      return (
        <Reply key={id} payload={this.payload}>
          {this.text}
        </Reply>
      )
    }
    let props = {}
    if (this.url) props = { url: this.url }
    return (
      // @ts-ignore
      <Button key={id} payload={this.payload} {...props}>
        {this.text}
      </Button>
    )
  }
}
