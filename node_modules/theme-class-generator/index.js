(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD
    define(factory)
  } else if (typeof exports === "object") {
    // CommonJS
    module.exports = factory()
  } else {
    // global or window
    root.themeClassGenerator = factory()
  }
}(this, function () {
  var defaultThemeConfig = {
    colors: {},
    shadows: {},
    radiuses: {
      'small': '3px',
      'large': '5px'
    }
  }

  var pseudos = [
    'link',
    'visited',
    'hover',
    'active',
    'focus',
    'first-child',
    'last-child',
    'before',
    'after',
    'enabled',
    'disabled',
    'checked'
  ]

  function generate (names, valueName, value, prefix) {
    prefix = prefix ? prefix + '-' : ''
    var res = ''
    for (var i = 0; i < names.length; i++) {
      res += '.' + prefix + names[i] + '--' + valueName + '{' + names[i] + ':' + value + '}'
      res += '.' + prefix + names[i] + '--' + valueName + '-important{' + names[i] + ':' + value + '!important}'
      pseudos.forEach(pseudo => {
        res += '.' + prefix + pseudo + '-' + names[i] + '--' + valueName + ':' + pseudo + '{' + names[i] + ':' + value + '}'
        res += '.' + prefix + pseudo + '-' + names[i] + '--' + valueName + '-important:' + pseudo + '{' + names[i] + ':' + value + '!important}'
      })
    }
    return res
  }

  function genColorClasses (colorName, colorNumber, prefix) {
    var res = ''
    // generate font color classes
    res += generate(['color'], colorName, colorNumber, prefix)

    // generate placeholder color classes
    res += '.' + prefix + '-placeholder-color--' + colorName + '::-webkit-input-placeholder{color:' + colorNumber + '}'
    res += '.' + prefix + '-placeholder-color--' + colorName + ':-moz-placeholder{color:' + colorNumber + '}'
    res += '.' + prefix + '-placeholder-color--' + colorName + '::-moz-placeholder{color:' + colorNumber + '}'
    res += '.' + prefix + '-placeholder-color--' + colorName + ':-ms-input-placeholder{color:' + colorNumber + '}'
    
    // generate border color classes
    res += generate([
      'border-color',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color'
    ], colorName, colorNumber, prefix)

    // generate background color classes
    res += generate(['background-color'], colorName, colorNumber, prefix)
    return res
  }

  function genShadowClasses (shadowName, shadowValue, prefix) {
    return generate(['box-shadow'], shadowName, shadowValue, prefix)
  }

  function genRadiusClasses (radiusName, radiusValue, prefix) {
    return generate([
      'border-radius',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-left-radius',
      'border-bottom-right-radius'
    ], radiusName, radiusValue, prefix)
  }

  function simpleClone (obj) {
    return JSON.parse(JSON.stringify(obj))
  }

  function isValidHex (hex, ignoreWarning) {
    var res = !(typeof hex !== 'string' || hex[0] !== '#' || (hex.length !== 4 && hex.length !== 7))
    if (!res && !ignoreWarning) console.error('Theme class generator @ hex2rgb: invalid hex format "' + hex + '"')
    return res
  }

  function isValidShadow (shadow) {
    if (!shadow) return false
    var arr = shadow.split(/\s+/)
    // 0px 0px 2px #f63
    for (var i = 0; i < arr.length - 1; i++) {
      if (!/^\d+px$/g.test(arr[i])) {
        console.error('Theme class generator @ hex2rgb: invalid shadow format "' + shadow + '"')
        return false
      }
    }
    if (!isValidHex(arr[3], true)) {
      console.error('Theme class generator @ hex2rgb: invalid shadow format "' + shadow + '"')
      return false
    }
    return true
  }

  /**
  * hex to HSL.
  *
  * @param hex
  *   color hex value, should be like #f63 or #ff6633
  * @return Array
  *   return an array which each element in it  stands for r, g and b
  */
  function hex2rgb (hex) {
    if (isValidHex(hex)) {
      var res = []
      hex = hex.substring(1).toLowerCase()

      if (hex.length === 3) {
        hex = Array.prototype.map.call(hex, function (e) {
          return e + '' + e
        }).join('')
      }

      for (var i = 0; i < hex.length; i++) {
        res.push(parseInt('0x' + hex.substring(i, ++i + 1)))
      }
      return res
    }
  }

  /**
  * rgb to hsl
  * reference https://www.rapidtables.com/convert/color/rgb-to-hsl.html
  *
  * @param   Array
  *   an array which each element in it stands for r, g and b
  * @return  Array
  *   an array which each element in it stands for h, s and l
  */
  function rgb2hsl(rgb) {
    var r = rgb[0] / 255
    var g = rgb[1] / 255
    var b = rgb[2] / 255
    var max = Math.max(r, g, b)
    var min = Math.min(r, g, b)
    var d = max - min
    var h = 0
    var s = 0
    var l = (max + min) / 2 * 100

    if (d !== 0) {
      // calc h
      switch (max) {
        case r:
          h = 60 * ((g - b) / d % 6)
          break
        case g:
          h = 60 * ((b - r) / d + 2)
          break
        case b:
          h = 60 * ((r - g) / d + 4)
          break
      }

      // calc s
      s = d / (1 - Math.abs(2 * (l / 100) - 1)) * 100
    }
    // console.log(h, s, l)
    return [(h < 0 ? 360 + h : h).toFixed(2), s.toFixed(4), l.toFixed(4)]
  }

  function hex2hsl (hex) {
    // console.log(hex, hex2rgb(hex), rgb2hsl(hex2rgb(hex)))
    return rgb2hsl(hex2rgb(hex))
  }
  
  function getSpecifiedColorValue (hex) {
    if (hex && isValidHex(hex)) {
      return hex
    }
  }

  return function (config) {
    config = config || {}
    var theme = config.theme || {}
    var prefix = config.prefix || ''
    var lightnessReverse = config.lightnessReverse || false
    var baseColorLevel = config.baseColorLevel || 12
    var baseColorHue = config.baseColorHue || '10%'
    var colorUpDown = config.colorUpDown || config.colorUpDown === 0 ? 0 : 10
    var colorTopBottom = config.colorTopBottom || (config.colorTopBottom === 0 ? 0 : 10)
    var baseShadowOpacity = config.baseShadowOpacity || (config.baseShadowOpacity === 0 ? 0 : 0.2)
    var colorShadowOpacity = config.colorShadowOpacity || (config.colorShadowOpacity === 0 ? 0 : 0.6)

    var finalTheme = simpleClone(defaultThemeConfig)
    if (typeof theme === 'object') {
      for (var name in theme) {
        if (theme[name]) {
          if (typeof theme[name] === 'object') {
            finalTheme[name] = finalTheme[name] ? finalTheme[name] : {}
            Object.assign(finalTheme[name], theme[name])
          } else {
            console.error('Theme class generator @ config.theme.' + name + ' should be an object')
          }
        }
      }
    } else {
      console.error('Theme class generator @ theme should be an object')
    }

    var res = ''

    // generate color classes
    for (var colorName in finalTheme.colors) {
      // calculate relative colors
      var direction = lightnessReverse ? -1 : 1
      colorValue = hex2hsl(finalTheme.colors[colorName])
      var colorGroup = {}
      colorGroup[colorName + '-top'] = getSpecifiedColorValue(colorGroup[colorName + '-top']) || [colorValue[0], colorValue[1], lightnessReverse ? 100 - colorTopBottom + '' : colorTopBottom + ''],
      colorGroup[colorName + '-up'] = getSpecifiedColorValue(colorGroup[colorName + '-up']) || [colorValue[0], colorValue[1], colorValue[2] - colorUpDown * direction + ''],
      colorGroup[colorName] = colorValue
      colorGroup[colorName + '-down'] = getSpecifiedColorValue(colorGroup[colorName + '-down']) || [colorValue[0], colorValue[1], Number(colorValue[2]) + colorUpDown * direction + ''],
      colorGroup[colorName + '-bottom'] = getSpecifiedColorValue(colorGroup[colorName + '-bottom']) || [colorValue[0], colorValue[1], !lightnessReverse ? 100 - colorTopBottom + '' : colorTopBottom + '']

      for (var name in colorGroup) {
        var value = colorGroup[name].map(function (e) { return e })
        // console.log(name, value)
        value[1] = value[1] + '%'
        value[2] = value[2] + '%'
        res += genColorClasses(
          name,
          'hsl(' + value.join(',') + ')',
          prefix
        )
      }

      // generate shadow classes
      res += isValidShadow(finalTheme.shadows[colorName])
        ? genShadowClasses(colorName, finalTheme.shadows[colorName], prefix)
        : genShadowClasses(colorName, '0 0px 4px hsla(' + [colorValue[0], colorValue[1] + '%', colorValue[2] + '%'].join(',') + ',' + colorShadowOpacity + ')', prefix)

      // calculate non-colors
      if (colorName === 'primary') {
        for (var i = 0; i <= baseColorLevel; i++) {
          res += genColorClasses(
            'base-' + i,
            'hsl(' + [colorValue[0], baseColorHue, (100 / baseColorLevel).toFixed(2) * (lightnessReverse ? (baseColorLevel - i) : i) + '%'].join(',') + ')',
            prefix
          )

          // generate base shadow classes
          res += isValidShadow(finalTheme.shadows.base)
            ? finalTheme.shadows.base
            : genShadowClasses('base', '0 0px 4px hsla(' + [colorValue[0], '0%', '0%'].join(',') + ',' + baseShadowOpacity + ')', prefix)
        }
      }
    }
    
    // generate custom shadow classes
    for (var shadowName in finalTheme.shadows) {
      if (finalTheme.colors[shadowName] || shadowName === 'base') continue
      if (isValidShadow(finalTheme.shadows[shadowName])) {
        res += genShadowClasses(shadowName, finalTheme.shadows[shadowName], prefix)
      }
    }

    // generate border-radius classes
    for (var radiusName in finalTheme.radiuses) {
      if (!/^\d+px$/.test(finalTheme.radiuses[radiusName])) {
        console.error('Theme class generator @ hex2rgb: invalid radius format "' + finalTheme.radiuses[radiusName] + '"')
        continue
      }
      res += genRadiusClasses(radiusName, finalTheme.radiuses[radiusName], prefix)
    }

    return res
  }
}))
