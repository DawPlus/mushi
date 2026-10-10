import {
  ReactBitsAnimatedList,
  type ReactBitsAnimatedListProps,
} from '../ui/react-bits-animated-list'

export type AppAnimatedListProps<T> = ReactBitsAnimatedListProps<T>

export function AppAnimatedList<T>(props: AppAnimatedListProps<T>) {
  return <ReactBitsAnimatedList {...props} />
}
