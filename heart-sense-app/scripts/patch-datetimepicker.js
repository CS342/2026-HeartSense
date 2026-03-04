/**
 * Patches @react-native-community/datetimepicker so that onChange fires on iOS
 * when React Native New Architecture (Fabric) is enabled.
 *
 * See: https://github.com/react-native-datetimepicker/datetimepicker/issues/995
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-community',
  'datetimepicker',
  'ios',
  'RNDateTimePicker.m'
);

if (!fs.existsSync(filePath)) {
  console.warn('patch-datetimepicker: RNDateTimePicker.m not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

const oldBlock = `    #ifndef RCT_NEW_ARCH_ENABLED
      // somehow, with Fabric, the callbacks are executed here as well as in RNDateTimePickerComponentView
      // so do not register it with Fabric, to avoid potential problems
      [self addTarget:self action:@selector(didChange)
               forControlEvents:UIControlEventValueChanged];
      [self addTarget:self action:@selector(onDismiss:) forControlEvents:UIControlEventEditingDidEnd];
    #endif`;

const newBlock = `    // Patched: always register so onChange fires with New Architecture enabled (issue #995)
      [self addTarget:self action:@selector(didChange)
               forControlEvents:UIControlEventValueChanged];
      [self addTarget:self action:@selector(onDismiss:) forControlEvents:UIControlEventEditingDidEnd];`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content);
  console.log('patch-datetimepicker: RNDateTimePicker.m patched for New Architecture');
} else if (content.includes(newBlock)) {
  console.log('patch-datetimepicker: already patched');
} else {
  console.warn('patch-datetimepicker: block not found, patch may need updating');
}
