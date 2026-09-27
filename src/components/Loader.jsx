export default function Loader({ small }) {
  return (
    <div className={`flex items-center justify-center ${small ? "py-2" : "py-16"}`}>
      <div
        className={`animate-spin rounded-full border-fb-blue border-t-transparent ${
          small ? "h-5 w-5 border-2" : "h-10 w-10 border-4"
        }`}
      />
    </div>
  );
}
