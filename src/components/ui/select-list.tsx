/**
 * Taken from https://github.com/danish1658/react-native-dropdown-select-list
 */

import React, { JSX } from 'react';
import {
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';

import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export interface SelectListProps {
  /**
  * Fn to set Selected option value which will be stored in your local state
  */
  setSelected: Function,

  /**
  * Placeholder text that will be displayed in the select box
  */
  placeholder?: string,

  /**
  * Additional styles for select box
  */
  boxStyles?: ViewStyle,

  /**
  *  	Additional styles for text of select box
  */
  inputStyles?: TextStyle,

  /**
  *  	Additional styles for dropdown scrollview
  */
  dropdownStyles?: ViewStyle,

  /**
  *  Additional styles for dropdown list item
  */
  dropdownItemStyles?: ViewStyle,

  /**
  * Additional styles for list items text
  */
  dropdownTextStyles?: TextStyle,

  /**
  * Maximum height of the dropdown wrapper to occupy
  */
  maxHeight?: number,

  /**
  * Data which will be iterated as options of select list
  */
  data: {}[],

  /**
  * The default option of the select list
  */
  defaultOption?: { key: any, value: any },

  /**
  *  Pass any JSX to this prop like Text, Image or Icon to show instead of chevron icon
  */
  arrowicon?: JSX.Element,

  /**
  * Trigger an action when option is selected
  */
  onSelect?: () => void,

  /**
  * set fontFamily of whole component Text 
  */
  fontFamily?: string,

  /**
  * set this to change the default search failure text
  */
  notFoundText?: string,

  /**
  * Additional styles for disabled list item
  */
  disabledItemStyles?: ViewStyle,

  /**
  * Additional styles for disabled list items text
  */
  disabledTextStyles?: TextStyle,

  /**
  * What to store inside your local state (key or value)
  */
  save?: 'key' | 'value',

  /**
  * Control the dropdown with this prop
  */
  dropdownShown?: boolean,
}


type L1Keys = { key?: any; value?: any; disabled?: boolean | undefined }

type VoidFn = (...args: any[]) => void;

const noOpEffectEvent = (f: VoidFn) => f;
const useEffectEvent: (f: VoidFn) => VoidFn =
  "useEffectEvent" in React ? (React.useEffectEvent as typeof noOpEffectEvent) : noOpEffectEvent;

const SelectList: React.FC<SelectListProps> = ({
  setSelected,
  placeholder,
  boxStyles,
  inputStyles,
  dropdownStyles,
  dropdownItemStyles,
  dropdownTextStyles,
  maxHeight,
  data,
  defaultOption,
  arrowicon = false,
  notFoundText = "No data found",
  disabledItemStyles,
  disabledTextStyles,
  onSelect = () => { },
  save = 'key',
  dropdownShown = false,
  fontFamily
}) => {

  const oldOption = React.useRef(null)
  const [_firstRender, _setFirstRender] = React.useState<boolean>(true);
  const [dropdown, setDropdown] = React.useState<boolean>(dropdownShown);
  const [selectedval, setSelectedVal] = React.useState<any>("");
  const [height, setHeight] = React.useState<number>(200)

  const animatedHeight = useSharedValue(0);


  const slidedown = useEffectEvent(() => {
    setDropdown(true)
    animatedHeight.value = withTiming(height, { duration: 200, easing: Easing.linear });
  });
  const slideup = useEffectEvent(() => {
    animatedHeight.value = withTiming(
      0,
      { duration: 200, easing: Easing.linear },
      () => { scheduleOnRN(setDropdown, false); }
    );
  });

  React.useEffect(() => {
    if (maxHeight)
      setHeight(maxHeight)
  }, [maxHeight])


  React.useEffect(() => {
    if (_firstRender) {
      _setFirstRender(false);
      return;
    }
    onSelect()
  }, [_firstRender, onSelect])


  React.useEffect(() => {
    if (!_firstRender && defaultOption && oldOption.current !== defaultOption.key) {
      // oldOption.current != null
      oldOption.current = defaultOption.key
      setSelected(defaultOption.key);
      setSelectedVal(defaultOption.value);
    }
    if (defaultOption && _firstRender && defaultOption.key !== undefined) {

      oldOption.current = defaultOption.key
      setSelected(defaultOption.key);
      setSelectedVal(defaultOption.value);
    }

  }, [_firstRender, defaultOption, setSelected])

  React.useEffect(() => {
    if (!_firstRender) {
      if (dropdownShown)
        slidedown();
      else
        slideup();
    }
  }, [_firstRender, dropdownShown, slidedown, slideup])

  const renderItem = (item: L1Keys, index: number) => {
    let key = item.key ?? item.value ?? item;
    let value = item.value ?? item;

    let disabled = item.disabled ?? false;
    if (disabled) {
      return (
        <TouchableOpacity style={[styles.disabledoption, disabledItemStyles]} key={index} onPress={() => { }}>
          <Text style={[{ color: '#c4c5c6', fontFamily }, disabledTextStyles]}>{value}</Text>
        </TouchableOpacity>
      )
    }

    return (
      <TouchableOpacity style={[styles.option, dropdownItemStyles]} key={index} onPress={() => {
        if (save === 'value') {
          setSelected(value);
        } else {
          setSelected(key)
        }

        setSelectedVal(value)
        slideup()

      }}>
        <Text style={[{ fontFamily }, dropdownTextStyles]}>{value}</Text>
      </TouchableOpacity>
    )
  };


  const heightStyle = useAnimatedStyle(() => ({ maxHeight: animatedHeight.value }));

  return (
    <View>
      <TouchableOpacity style={[styles.wrapper, boxStyles]} onPress={() => { if (!dropdown) { Keyboard.dismiss(); slidedown() } else { slideup() } }}>
        <Text style={[{ fontFamily }, inputStyles]}>{(selectedval === "") ? (placeholder) ? placeholder : 'Select option' : selectedval}</Text>
        {
          (!arrowicon)
            ?
            <Image
              source={require('@assets/images/chevron.png')}
              resizeMode='contain'
              style={{ width: 20, height: 20 }}
            />
            :
            arrowicon
        }

      </TouchableOpacity>

      {dropdown &&
        <Reanimated.View style={[heightStyle, styles.dropdown, dropdownStyles]}>
          <ScrollView contentContainerStyle={{ paddingVertical: 10, overflow: 'hidden' }} nestedScrollEnabled={true}>
            {
              (data.length >= 1)
                ?
                data.map(renderItem)
                :
                <TouchableOpacity style={[styles.option, dropdownItemStyles]} onPress={() => {
                  setSelected(undefined)
                  setSelectedVal("")
                  slideup()
                }}>
                  <Text style={[{ fontFamily }, dropdownTextStyles]}>{notFoundText}</Text>
                </TouchableOpacity>
            }
          </ScrollView>
        </Reanimated.View>
      }


    </View>
  )
}


export default SelectList;


const styles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderRadius: 10, borderColor: 'gray', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' },
  dropdown: { borderWidth: 1, borderRadius: 10, borderColor: 'gray', marginTop: 10, overflow: 'hidden' },
  option: { paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden' },
  disabledoption: { paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'whitesmoke', opacity: 0.9 }

})
