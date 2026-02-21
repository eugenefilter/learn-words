import React from 'react';
import { View, Text, Pressable } from 'react-native';
import theme from '@/constants/theme';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, padding: 24 }}>
          <Text style={{ color: theme.colors.danger, fontSize: 20, marginBottom: 8 }}>Что-то пошло не так</Text>
          <Text style={{ color: theme.colors.text, opacity: 0.7, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error.message}
          </Text>
          <Pressable
            onPress={this.reset}
            style={{ backgroundColor: theme.colors.accent700, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>Попробовать снова</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
