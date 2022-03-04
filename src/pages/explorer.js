const ExplorerPage = () => {
  /*
    Render the GraphiQL interface.
    */
  return (
    <main className="rows">
      <iframe
        className="embed"
        title="graphiql"
        src="/graphiql"
        style={{ flexGrow: 1 }}
      />
    </main>
  )
}

export default ExplorerPage
