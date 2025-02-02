import { CommonProps} from "utils/common.ts";
import { Country } from "config/countries.ts";
import { PsrMap } from "config/psrmap.ts";
import { DBResultSet, ExchangeRateResult } from "../backend/db/index.ts";

interface GenerationOverviewProps extends CommonProps {
  cols: number;
  country: Country;
  er: ExchangeRateResult;
  generation: DBResultSet;
  load: DBResultSet;
}

interface LastGenerationEntry {
  date: Date,
  value: number
}

export default function GenerationOverview(props: GenerationOverviewProps) {

  // Find last value for each production type
  const lastGeneration : Record<string, LastGenerationEntry> = {};
  let lastGenerationDate = 0;
  for(let i = 0; i < props.generation.data.length; i++) {
    // Only use data within three hours, or last row
    const 
      currentGeneration = props.generation.data[i],
      dateMs = currentGeneration[0] as number,
      psr = currentGeneration[1] as string,
      value = currentGeneration[2] as number;
    // Update date
    if (!lastGenerationDate || lastGenerationDate < dateMs) lastGenerationDate = dateMs;
    // Update object
    if (!lastGeneration[psr] || lastGeneration[psr].date.getTime() < dateMs) {
      lastGeneration[psr] = {
        date: new Date(dateMs),
        value: value
      }
    }
  }

  // Aggregate lastgeneration
  const lastGenerationAggregated : Record<string,LastGenerationEntry> = {};
  for(const lg of Object.entries(lastGeneration)) {
    if (lastGenerationAggregated[PsrMap[lg[0]]]) {
      lastGenerationAggregated[PsrMap[lg[0]]].date = lastGenerationAggregated[PsrMap[lg[0]]].date > lg[1].date ? lastGenerationAggregated[PsrMap[lg[0]]].date : lg[1].date,
      lastGenerationAggregated[PsrMap[lg[0]]].value = lastGenerationAggregated[PsrMap[lg[0]]].value + lg[1].value;
    } else {
      lastGenerationAggregated[PsrMap[lg[0]]] = {
        date: lg[1].date,
        value: lg[1].value
      };
    }
  }

  const 
    lastGenerationSorted = Object.entries(lastGenerationAggregated);
  lastGenerationSorted.sort((a,b) => b[1].value - a[1].value);

  const 
    generationTotal = Object.values(lastGeneration).reduce((a, b) => {
      return a + b.value;
    },0),
    lastGenerationDateEnd = props.generation?.data.length ? new Date(lastGenerationDate + (props.generation.data[0][3] == "PT60M" ? 3600 : 900 ) * 1000) : undefined;

  // Find load at matching point of time
  let loadTotal = 0;
  for(const loadEntry of props.load.data) {
    if (loadEntry[0] === lastGenerationDate) {
      loadTotal = loadEntry[1] as number;
    }
  }

  // If load at matching point of time wasn't found, use last load
  if (!loadTotal && props.load?.data?.length) loadTotal = props.load.data[props.load.data.length-1][1] as number;

  // Calculate total
  const netTotal = generationTotal - loadTotal;

  return (
    <div class={`col-lg-${props.cols} m-0 p-0`}>
      <div class="mw-full m-0 p-0 mr-20 mt-20">
        <div class="card p-0 m-0">
          <div class={"px-card py-10 m-0 rounded-top"}>
            <h2 class="card-title font-size-18 m-0 text-center">
              <span data-t-key="common.generation.current_production" lang={props.lang}>Aktuell produktion och last</span>
            </h2>
          </div>
          <div class="content px-card m-0 p-0 pb-15 bg-very-dark">
            <div>
              <table class="table">
                <tbody>
                  <tr><th data-t-key="common.generation.production" lang={props.lang}>Produktion</th><th>{ generationTotal } MW</th></tr>
                  { lastGenerationSorted.map(g => g[1].value !== 0 && (
                    <>
                      <tr><td><span data-t-key={"common.generation.psr_"+g[0].toLowerCase().replace(/[^a-zA-Z]/g,"_")} lang={props.lang}>{ g[0] }</span> - {(g[1].value/generationTotal*100).toFixed(1)} %</td><td>{ g[1].value } MW</td></tr>
                    </>
                  ))}
                  <tr><th data-t-key="common.generation.consumption" lang={props.lang}>Förbrukning</th><th>{ loadTotal } MW</th></tr>
                  <tr class={"table-"+ (netTotal < 0 ? "danger" : "success")}><th data-t-key={"common.generation."+(netTotal < 0 ? "deficit" : "excess")} lang={props.lang}>{ netTotal < 0 ? "Underskott" : "Överskott" }</th><th>{ netTotal } MW</th></tr>
                </tbody>
              </table>
              <p class="text-right mb-0 mr-15"><small><i><span data-t-key="common.generation.last_updated" lang={props.lang}>Senast uppdaterat</span>: { lastGenerationDateEnd?.toLocaleString() }</i></small></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
