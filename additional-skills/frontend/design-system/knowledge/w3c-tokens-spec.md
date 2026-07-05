---
type: fact
title: "W3C Design Tokens Format Reference"
---

# W3C Design Tokens Community Group Format

## Structure

```json
{
  "group-name": {
    "$description": "Optional group description",
    "token-name": {
      "$value": "<value>",
      "$type": "<type>",
      "$description": "Optional description"
    }
  }
}
```

## Rules

1. Token names: any string key without `$` prefix
2. Properties starting with `$` are reserved: `$value`, `$type`, `$description`, `$extensions`
3. An object with `$value` is a token; without it, it's a group
4. `$type` can be on group (inherited by children) or on individual tokens
5. References: `"{group.token}"` resolves to another token's value

## Types

### color
```json
{ "$value": "#0055cc", "$type": "color" }
{ "$value": "#0055cc80", "$type": "color" }
```

### dimension
```json
{ "$value": "16px", "$type": "dimension" }
{ "$value": "1.5rem", "$type": "dimension" }
```

### fontFamily
```json
{ "$value": "Inter, system-ui, sans-serif", "$type": "fontFamily" }
{ "$value": ["Inter", "system-ui", "sans-serif"], "$type": "fontFamily" }
```

### fontWeight
```json
{ "$value": 400, "$type": "fontWeight" }
{ "$value": "bold", "$type": "fontWeight" }
```
Named values: thin(100), extralight(200), light(300), regular(400), medium(500), semibold(600), bold(700), extrabold(800), black(900).

### duration
```json
{ "$value": "200ms", "$type": "duration" }
```

### cubicBezier
```json
{ "$value": [0.4, 0, 0.2, 1], "$type": "cubicBezier" }
```

### shadow
```json
{
  "$value": {
    "color": "#00000033",
    "offsetX": "0px",
    "offsetY": "4px",
    "blur": "8px",
    "spread": "0px"
  },
  "$type": "shadow"
}
```

Multiple shadows (array):
```json
{
  "$value": [
    { "color": "#00000033", "offsetX": "0px", "offsetY": "2px", "blur": "4px", "spread": "0px" },
    { "color": "#0000001a", "offsetX": "0px", "offsetY": "4px", "blur": "8px", "spread": "0px" }
  ],
  "$type": "shadow"
}
```

### typography (composite)
```json
{
  "$value": {
    "fontFamily": "{font.family.sans}",
    "fontSize": "{font.size.lg}",
    "fontWeight": "{font.weight.bold}",
    "lineHeight": "1.4",
    "letterSpacing": "-0.01em"
  },
  "$type": "typography"
}
```

### border (composite)
```json
{
  "$value": {
    "color": "{color.border.default}",
    "width": "1px",
    "style": "solid"
  },
  "$type": "border"
}
```

### gradient
```json
{
  "$value": [
    { "color": "#0055cc", "position": 0 },
    { "color": "#66aaff", "position": 1 }
  ],
  "$type": "gradient"
}
```

## References (Aliases)

```json
{
  "color": {
    "blue": {
      "500": { "$value": "#0055cc", "$type": "color" }
    },
    "action": {
      "primary": { "$value": "{color.blue.500}", "$type": "color" }
    }
  }
}
```

- References use dot-path notation inside `{}`
- Circular references are invalid
- Reference must resolve to a token with `$value`
- Reference type should match or be compatible

## Extensions

Vendor-specific data goes in `$extensions`:
```json
{
  "color-primary": {
    "$value": "#0055cc",
    "$type": "color",
    "$extensions": {
      "com.figma": { "scopes": ["FRAME_FILL", "SHAPE_FILL"] },
      "com.tokens-studio": { "modify": { "type": "darken", "value": "0.1" } }
    }
  }
}
```

## File Organization

Split tokens across files; tools merge by directory:
```
tokens/
  primitives/
    colors.json      <- Raw palette
    spacing.json     <- Scale values
    typography.json  <- Font stacks, sizes, weights
  semantic/
    colors.json      <- Purpose-based aliases
    spacing.json     <- Usage-based aliases
  components/
    button.json      <- Component-specific tokens
    card.json
```
