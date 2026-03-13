import React from "react";
import { useI18n } from "../i18n/useI18n";
import type { Translations } from "../i18n/translations";

interface HelpTooltipProps {
  helpKey: keyof Translations;
  fallbackKey?: keyof Translations;
  children: React.ReactElement;
}

/** Injects title (tooltip) on child: help text when helpMode, fallback otherwise. */
export function HelpTooltip({ helpKey, fallbackKey, children }: HelpTooltipProps) {
  const { helpMode, t } = useI18n();
  const title = helpMode ? (t[helpKey] as string) : (fallbackKey ? (t[fallbackKey] as string) : undefined);
  return React.cloneElement(children, { ...children.props, title: title || children.props.title });
}
