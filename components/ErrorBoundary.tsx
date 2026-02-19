import React from 'react';
import { View, Text, Pressable } from 'react-native';

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#102222', padding: 24 }}>
          <Text style={{ color: '#ef4444', fontSize: 20, marginBottom: 8 }}>Что-то пошло не так</Text>
          <Text style={{ color: '#d9ebeb', opacity: 0.7, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error.message}
          </Text>
          <Pressable
            onPress={this.reset}
            style={{ backgroundColor: '#0f766e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>Попробовать снова</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
